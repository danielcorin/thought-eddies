#!/usr/bin/env python3

"""
Pull entries from the "Thought Eddies" journal in the Logs app and create or
update daily log posts. Entries are read with the `logs` companion CLI, and
processed entry IDs are tracked in scripts/.sync_logs_state.json.

An entry's location is reduced to a city and written to the log's `location`
frontmatter. Attachments are pulled from a one-off `logs export` when needed.
Standalone x.com/twitter.com links become `<Tweet />` embeds, with the
`astro-embed` import added to the file. Multiple entries on the same day go in
one file separated by `---`.

After creating or updating log files, runs `/fix-typos` via `claude` on each.

Usage:
    python scripts/sync_logs.py [--dry-run] [--limit N]
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

STATE_FILE = Path(__file__).parent / ".sync_logs_state.json"
LOGS_DIR = Path(__file__).parent.parent / "src" / "content" / "logs"
LOCAL_TZ = ZoneInfo("America/New_York")
JOURNAL_NAME = "Thought Eddies"
LOGS_CLI_FALLBACK = "/Applications/Logs.app/Contents/Helpers/logs"

# Site convention: logs use short city names ('Brooklyn', 'NYC', 'SF').
CITY_ALIASES = {
    "New York": "NYC",
    "Manhattan": "NYC",
    "San Francisco": "SF",
}


@dataclass
class Entry:
    dt: datetime
    source: str
    id: str
    text: str
    attachments: list[dict] = field(default_factory=list)
    city: str | None = None


# --- Logs journal ------------------------------------------------------------


def find_logs_cli() -> str:
    for candidate in (os.environ.get("LOGS_CLI"), shutil.which("logs"), LOGS_CLI_FALLBACK):
        if candidate and os.access(candidate, os.X_OK):
            return candidate
    raise RuntimeError(
        "logs CLI not found. Install it from the Logs app (Install Command Line Tool) "
        "or set LOGS_CLI to the executable path."
    )


def run_logs_cli(args: list[str]) -> dict:
    """Run a `logs` command with --json and return the parsed response."""
    # Instrumented builds of the CLI write default.profraw into the cwd; discard it.
    env = {**os.environ, "LLVM_PROFILE_FILE": "/dev/null"}
    result = subprocess.run([find_logs_cli(), *args], capture_output=True, text=True, env=env)
    if result.returncode != 0:
        raise RuntimeError(f"logs CLI failed: {result.stderr.strip() or result.stdout.strip()}")
    data = json.loads(result.stdout)
    if not data.get("success", True):
        raise RuntimeError(f"logs CLI error: {data}")
    return data


def fetch_journal_entries(journal: str, limit: int | None = None) -> list[dict]:
    args = ["entry", "list", "--journal", journal, "--json"]
    if limit:
        args += ["--limit", str(limit)]
    return run_logs_cli(args).get("entries", [])


STATE_ZIP_RE = re.compile(r"^[A-Z]{2}\s+\d{5}(-\d{4})?$")


def city_from_address(address: str | None) -> str | None:
    """Reduce a geocoded address to a city name.

    Handles Apple's "street, city, ST ZIP, country" and "city, country" forms.
    """
    if not address:
        return None
    parts = [p.strip() for p in address.split(",") if p.strip()]
    if len(parts) >= 3 and STATE_ZIP_RE.match(parts[-2]):
        city = parts[-3]
    elif len(parts) >= 2:
        city = parts[-2]
    else:
        return None
    if STATE_ZIP_RE.match(city) or city.isdigit():
        return None
    return CITY_ALIASES.get(city, city)


def journal_entry(raw: dict) -> Entry:
    dt = datetime.fromisoformat(raw["entryDate"].replace("Z", "+00:00"))
    tz = LOCAL_TZ
    tz_name = (raw.get("context") or {}).get("timeZoneIdentifier")
    if tz_name:
        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            pass
    location = raw.get("location") or {}
    return Entry(
        dt=dt.astimezone(tz),
        source="journal",
        id=raw["id"],
        text=clean_text(raw.get("body") or ""),
        attachments=raw.get("attachments") or [],
        city=city_from_address(location.get("address")),
    )


# --- State -----------------------------------------------------------------------


def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {}


def save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, indent=2) + "\n")


# --- Text helpers ------------------------------------------------------------


def normalize_quotes(text: str) -> str:
    return text.replace("\u2018", "'").replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"')


def one_sentence_per_line(text: str) -> str:
    """Split text so each sentence starts on its own line."""
    # Split on sentence-ending punctuation followed by a space and a capital letter
    result = re.sub(r'([.!?])\s+(?=[A-Z])', r'\1\n', text)
    return result


TWEET_URL_PATTERN = r"https?://(?:www\.)?(?:twitter|x)\.com/[A-Za-z0-9_]+/status/\d+[^\s>)\]]*"
STANDALONE_TWEET_RE = re.compile(rf"^\s*<?(?P<url>{TWEET_URL_PATTERN})>?\s*$", re.I)


def tweet_embed_url(url: str) -> str:
    """Drop tracking params and trailing slashes from a tweet URL."""
    return re.sub(r"[?#].*$", "", url).rstrip("/")


def embed_tweets(text: str) -> str:
    """Turn links to a tweet that sit on their own line into <Tweet /> embeds."""
    out: list[str] = []
    for line in text.split("\n"):
        match = STANDALONE_TWEET_RE.match(line)
        rendered = f'<Tweet id="{tweet_embed_url(match.group("url"))}" />' if match else line
        # MDX only treats the component as a block if blank lines fence it off
        neighbors_embed = bool(match) or (bool(out) and out[-1].startswith("<Tweet id="))
        if neighbors_embed and out and out[-1].strip() and rendered.strip():
            out.append("")
        out.append(rendered)
    return "\n".join(out)


def clean_text(text: str) -> str:
    return embed_tweets(one_sentence_per_line(normalize_quotes(text.strip())))


def format_frontmatter_ts(dt: datetime) -> str:
    offset = dt.strftime("%z")
    return dt.strftime("%Y-%m-%dT%H:%M:%S") + offset[:-2] + ":" + offset[-2:]


def yaml_single_quoted(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.S)


def add_location(content: str, city: str | None) -> str:
    """Add `location` to the frontmatter if it's missing and a city is known."""
    if not city:
        return content
    match = FRONTMATTER_RE.match(content)
    if not match or re.search(r"^location:", match.group(1), re.M):
        return content
    frontmatter = match.group(1) + f"\nlocation: {yaml_single_quoted(city)}"
    return content[: match.start(1)] + frontmatter + content[match.end(1) :]


EMBED_IMPORTS = {"Tweet": "import { Tweet } from 'astro-embed';"}


def add_embed_imports(content: str) -> str:
    """Import any astro-embed component the body uses but doesn't import yet."""
    match = FRONTMATTER_RE.match(content)
    if not match:
        return content
    body = content[match.end() :]
    missing = [
        statement
        for name, statement in EMBED_IMPORTS.items()
        if f"<{name} " in body
        and not re.search(rf"import\s*\{{[^}}]*\b{name}\b[^}}]*\}}\s*from\s*['\"]astro-embed['\"]", body)
    ]
    if not missing:
        return content
    return content[: match.end()] + "\n" + "\n".join(missing) + "\n\n" + body.lstrip("\n")


SAFE_CHARS_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def safe_filename(name: str) -> str:
    name = SAFE_CHARS_RE.sub("-", name).strip("-.")
    return name or "file"


def is_image(content_type: str | None, filename: str) -> bool:
    if content_type and content_type.startswith("image/"):
        return True
    return Path(filename).suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"}


# --- Attachments -------------------------------------------------------------------


def optimize_png(path: Path) -> None:
    if shutil.which("pngquant") is None:
        print("  pngquant not found, skipping optimization", file=sys.stderr)
        return
    result = subprocess.run(
        ["pngquant", "--quality=65-80", "--ext=.png", "--force", str(path)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"  pngquant failed for {path}: {result.stderr}", file=sys.stderr)


# --- Log files ---------------------------------------------------------------------


def resolve_log_paths(date_str: str) -> tuple[Path, Path, Path, Path]:
    """Return (year_month_dir, flat_file, dir_file, images_dir) for a date."""
    year, month, day = date_str.split("-")
    base = LOGS_DIR / year / month
    return base, base / f"{day}.mdx", base / day / "index.mdx", base / day / "images"


def existing_log_file(date_str: str) -> Path | None:
    _, flat, dir_file, _ = resolve_log_paths(date_str)
    if dir_file.exists():
        return dir_file
    if flat.exists():
        return flat
    return None


def migrate_to_folder(date_str: str, dry_run: bool) -> Path:
    """Ensure date uses DD/index.mdx layout. Returns the index.mdx path."""
    _, flat, dir_file, _ = resolve_log_paths(date_str)
    if dir_file.exists():
        return dir_file
    if flat.exists():
        if dry_run:
            print(f"[dry-run] Would migrate {flat} -> {dir_file}")
            return dir_file
        dir_file.parent.mkdir(parents=True, exist_ok=True)
        flat.rename(dir_file)
        print(f"Migrated {flat} -> {dir_file}")
    return dir_file


def create_or_update_log(
    date_str: str,
    entries: list[str],
    first_msg_dt: datetime,
    has_attachments: bool,
    city: str | None = None,
    dry_run: bool = False,
) -> Path:
    _, flat, dir_file, _ = resolve_log_paths(date_str)

    use_folder = has_attachments or dir_file.exists()
    if use_folder:
        log_file = migrate_to_folder(date_str, dry_run)
    else:
        log_file = flat

    if log_file.exists():
        existing = add_location(log_file.read_text(), city)
        new_content = existing.rstrip() + "\n\n---\n\n" + "\n\n---\n\n".join(entries) + "\n"
    else:
        ts = format_frontmatter_ts(first_msg_dt)
        location_line = f"location: {yaml_single_quoted(city)}\n" if city else ""
        frontmatter = f"""---
date: '{ts}'
title: '{date_str}'
draft: false
tags: []
{location_line}---

"""
        new_content = frontmatter + "\n\n---\n\n".join(entries) + "\n"

    new_content = add_embed_imports(new_content)

    if dry_run:
        print(f"[dry-run] Would write to {log_file}:")
        print(new_content)
        print("---")
    else:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        log_file.write_text(new_content)
        print(f"Wrote {log_file}")

    return log_file


def attachment_markdown(local_name: str, filename: str, content_type: str | None) -> str:
    rel = f"images/{local_name}"
    if is_image(content_type, filename):
        alt = Path(filename).stem.replace("-", " ").replace("_", " ")
        return f"![{alt}]({rel})"
    return f"[{filename}]({rel})"


def finish_attachment(dest: Path) -> None:
    print(f"Saved {dest}")
    if dest.suffix.lower() == ".png":
        optimize_png(dest)


class JournalExport:
    """Lazily exports the journal once so attachment bytes can be copied.

    The CLI's JSON only carries attachment metadata; `logs export --format
    markdown` writes each attachment as attachments/<8-hex-of-id>-<filename>.
    """

    def __init__(self, journal: str):
        self.journal = journal
        self._tmp: tempfile.TemporaryDirectory | None = None
        self._files: dict[str, Path] | None = None

    def files(self) -> dict[str, Path]:
        if self._files is None:
            self._tmp = tempfile.TemporaryDirectory(prefix="sync-logs-")
            out = Path(self._tmp.name) / "export"
            run_logs_cli(
                ["export", "--format", "markdown", "--out", str(out), "--journal", self.journal, "--json"]
            )
            self._files = {p.name: p for p in out.glob("*/attachments/*") if p.is_file()}
            print(f"Exported {len(self._files)} journal attachment(s) for matching")
        return self._files

    def find(self, attachment_id: str) -> Path | None:
        prefix = journal_short_id(attachment_id) + "-"
        return next((p for name, p in self.files().items() if name.startswith(prefix)), None)

    def cleanup(self) -> None:
        if self._tmp is not None:
            self._tmp.cleanup()


def journal_short_id(attachment_id: str) -> str:
    return attachment_id.replace("-", "").lower()[:8]


def process_journal_attachments(
    date_str: str,
    attachments: list[dict],
    export: JournalExport,
    dry_run: bool,
) -> list[str]:
    """Copy exported journal attachments to DD/images/, return markdown lines."""
    if not attachments:
        return []
    _, _, _, images_dir = resolve_log_paths(date_str)
    lines: list[str] = []
    for att in attachments:
        att_id = att.get("id")
        if not att_id:
            continue
        filename = att.get("filename") or "attachment"
        short_id = journal_short_id(att_id)
        local_name = f"{short_id}-{safe_filename(filename)}"
        dest = images_dir / local_name

        if dry_run:
            print(f"[dry-run] Would export journal attachment {att_id} -> {dest}")
        else:
            source = export.find(att_id)
            if source is None:
                print(f"Warning: attachment {att_id} not found in journal export; skipping", file=sys.stderr)
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, dest)
            finish_attachment(dest)
        lines.append(attachment_markdown(local_name, filename, att.get("contentType")))
    return lines


def render_entry(text: str, attachment_md: list[str]) -> str:
    parts: list[str] = []
    if text:
        parts.append(text)
    if attachment_md:
        parts.append("\n\n".join(attachment_md))
    return "\n\n".join(parts)


def fix_typos(file_path: Path):
    print(f"Running fix-typos on {file_path}...")
    result = subprocess.run(
        ["claude", "-p", f"/fix-typos {file_path}"],
        capture_output=True,
        text=True,
        cwd=file_path.parent,
    )
    if result.returncode != 0:
        print(f"  fix-typos failed: {result.stderr}", file=sys.stderr)
    else:
        print(f"  fix-typos complete")


# --- Main ----------------------------------------------------------------------------


def collect_journal(state: dict, journal: str, limit: int, debug: bool) -> list[Entry]:
    """Return journal entries not yet processed, oldest first."""
    processed = set(state.get("processed_ids", []))
    raw_entries = [e for e in fetch_journal_entries(journal, limit) if e["id"] not in processed]
    print(f"Journal '{journal}': {len(raw_entries)} new entr{'y' if len(raw_entries) == 1 else 'ies'}")

    if debug and raw_entries:
        print("=== RAW JOURNAL ENTRIES ===")
        for raw in raw_entries:
            print(json.dumps(raw, indent=2, default=str))
        print("=== END ===")

    return sorted((journal_entry(raw) for raw in raw_entries), key=lambda e: e.dt)


def main():
    parser = argparse.ArgumentParser(description="Pull Logs journal entries into log posts")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing files")
    parser.add_argument("--limit", type=int, default=50, help="Number of entries to fetch")
    parser.add_argument("--journal", default=JOURNAL_NAME, help="Logs journal name to pull from")
    parser.add_argument("--skip-fix-typos", action="store_true", help="Skip running fix-typos")
    parser.add_argument("--debug", action="store_true", help="Print raw journal JSON for inspection")
    args = parser.parse_args()

    state = load_state()
    journal_state = state.setdefault("journal", {})

    try:
        entries = collect_journal(journal_state, args.journal, args.limit, args.debug)
    except (RuntimeError, OSError, ValueError) as exc:
        print(f"Error: journal source failed: {exc}", file=sys.stderr)
        sys.exit(1)

    fetched_journal_ids = [e.id for e in entries]
    entries = [e for e in entries if e.text or e.attachments]
    if not entries and not fetched_journal_ids:
        print("No new entries to process")
        return

    # Group by local date, oldest first within each day
    by_date: dict[str, list[Entry]] = defaultdict(list)
    for entry in entries:
        by_date[entry.dt.strftime("%Y-%m-%d")].append(entry)

    export = JournalExport(args.journal)
    modified_files: list[Path] = []
    for date_str in sorted(by_date.keys()):
        rows = sorted(by_date[date_str], key=lambda e: e.dt)
        has_attachments = any(e.attachments for e in rows)
        city = next((e.city for e in rows if e.city), None)

        rendered: list[str] = []
        for entry in rows:
            attachment_md = process_journal_attachments(
                date_str, entry.attachments, export, dry_run=args.dry_run
            )
            rendered.append(render_entry(entry.text, attachment_md))

        log_file = create_or_update_log(
            date_str,
            rendered,
            rows[0].dt,
            has_attachments=has_attachments,
            city=city,
            dry_run=args.dry_run,
        )
        modified_files.append(log_file)
    export.cleanup()

    if not args.dry_run and not args.skip_fix_typos:
        for f in modified_files:
            fix_typos(f)

    if not args.dry_run:
        now = datetime.now(LOCAL_TZ).isoformat()
        if fetched_journal_ids:
            journal_state["processed_ids"] = journal_state.get("processed_ids", []) + fetched_journal_ids
            journal_state["last_run"] = now
        save_state(state)
        print(f"State updated: {STATE_FILE}")


if __name__ == "__main__":
    main()
