#!/usr/bin/env python3
"""
Fetch recent messages from Threads #logs channel and create log posts.

Messages are grouped by date. Multiple messages on the same day go in one file
separated by `---`. A state file tracks the last processed message ID to avoid
duplicates.

After creating/updating log files, runs `/fix-typos` via `claude` on each.

Usage:
    THREADS_BOT_TOKEN=... python scripts/threads_logs_to_posts.py [--dry-run] [--limit N]
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

API_URL = os.environ.get("THREADS_API_URL")
BOT_TOKEN = os.environ.get("THREADS_BOT_TOKEN")
STATE_FILE = Path(__file__).parent / ".threads_logs_state.json"
LOGS_DIR = Path(__file__).parent.parent / "src" / "content" / "logs"
LOCAL_TZ = ZoneInfo("America/New_York")


def api_request(method: str, path: str) -> dict | list | None:
    resp = requests.request(
        method,
        f"{API_URL}{path}",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {BOT_TOKEN}",
        },
    )
    resp.raise_for_status()
    return resp.json()


def find_logs_channel() -> str:
    channels = api_request("GET", "/channels")
    for ch in channels:
        if ch["name"] == "logs":
            return ch["id"]
    raise RuntimeError("Channel #logs not found")


def fetch_messages(channel_id: str, limit: int = 50) -> list[dict]:
    data = api_request("GET", f"/channels/{channel_id}/messages?limit={limit}")
    if isinstance(data, dict) and "messages" in data:
        return data["messages"]
    return data if isinstance(data, list) else []


def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {}


def save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, indent=2) + "\n")


def parse_timestamp(ts: int | str) -> datetime:
    if isinstance(ts, (int, float)):
        dt = datetime.fromtimestamp(ts, tz=ZoneInfo("UTC"))
    else:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    return dt.astimezone(LOCAL_TZ)


def normalize_quotes(text: str) -> str:
    return text.replace("\u2018", "'").replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"')


def one_sentence_per_line(text: str) -> str:
    """Split text so each sentence starts on its own line."""
    # Split on sentence-ending punctuation followed by a space and a capital letter
    result = re.sub(r'([.!?])\s+(?=[A-Z])', r'\1\n', text)
    return result


def format_frontmatter_ts(dt: datetime) -> str:
    offset = dt.strftime("%z")
    return dt.strftime("%Y-%m-%dT%H:%M:%S") + offset[:-2] + ":" + offset[-2:]


SAFE_CHARS_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def safe_filename(name: str) -> str:
    name = SAFE_CHARS_RE.sub("-", name).strip("-.")
    return name or "file"


def is_image(content_type: str | None, filename: str) -> bool:
    if content_type and content_type.startswith("image/"):
        return True
    return Path(filename).suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"}


def download_attachment(url_path: str, dest: Path) -> None:
    resp = requests.get(
        f"{API_URL}{url_path}",
        headers={"Authorization": f"Bearer {BOT_TOKEN}"},
        stream=True,
    )
    resp.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("wb") as f:
        for chunk in resp.iter_content(chunk_size=64 * 1024):
            if chunk:
                f.write(chunk)


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
    dry_run: bool = False,
) -> Path:
    _, flat, dir_file, _ = resolve_log_paths(date_str)

    use_folder = has_attachments or dir_file.exists()
    if use_folder:
        log_file = migrate_to_folder(date_str, dry_run)
    else:
        log_file = flat

    if log_file.exists():
        existing = log_file.read_text()
        new_content = existing.rstrip() + "\n\n---\n\n" + "\n\n---\n\n".join(entries) + "\n"
    else:
        ts = format_frontmatter_ts(first_msg_dt)
        frontmatter = f"""---
date: '{ts}'
title: '{date_str}'
draft: false
tags: []
---

"""
        new_content = frontmatter + "\n\n---\n\n".join(entries) + "\n"

    if dry_run:
        print(f"[dry-run] Would write to {log_file}:")
        print(new_content)
        print("---")
    else:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        log_file.write_text(new_content)
        print(f"Wrote {log_file}")

    return log_file


def process_attachments(
    date_str: str,
    msg_id: str,
    attachments: list[dict],
    dry_run: bool,
) -> list[str]:
    """Download attachments to DD/images/, optimize PNGs, return markdown lines."""
    if not attachments:
        return []
    _, _, _, images_dir = resolve_log_paths(date_str)
    lines: list[str] = []
    for att in attachments:
        url_path = att.get("url")
        filename = att.get("filename") or att.get("id") or "file"
        content_type = att.get("contentType")
        if not url_path:
            continue
        # Prefix with short id slice to avoid collisions across messages
        short_id = (att.get("id") or msg_id)[:8]
        safe_name = safe_filename(filename)
        local_name = f"{short_id}-{safe_name}"
        dest = images_dir / local_name

        if dry_run:
            print(f"[dry-run] Would download {url_path} -> {dest}")
        else:
            download_attachment(url_path, dest)
            print(f"Downloaded {dest}")
            if dest.suffix.lower() == ".png":
                optimize_png(dest)

        rel = f"images/{local_name}"
        if is_image(content_type, filename):
            alt = Path(filename).stem.replace("-", " ").replace("_", " ")
            lines.append(f"![{alt}]({rel})")
        else:
            lines.append(f"[{filename}]({rel})")
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


def main():
    parser = argparse.ArgumentParser(description="Sync Threads #logs to log posts")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing files")
    parser.add_argument("--limit", type=int, default=50, help="Number of messages to fetch")
    parser.add_argument("--skip-fix-typos", action="store_true", help="Skip running fix-typos")
    parser.add_argument("--debug", action="store_true", help="Print raw message JSON for inspection")
    args = parser.parse_args()

    if not BOT_TOKEN:
        print("Error: THREADS_BOT_TOKEN environment variable required", file=sys.stderr)
        sys.exit(1)

    state = load_state()
    last_processed_id = state.get("last_processed_id")

    channel_id = find_logs_channel()
    print(f"Found #logs channel: {channel_id}")

    messages = fetch_messages(channel_id, limit=args.limit)
    if not messages:
        print("No messages found")
        return

    # Filter to only new messages
    if last_processed_id:
        new_messages = []
        found_last = False
        for msg in messages:
            if found_last:
                new_messages.append(msg)
            elif msg["id"] == last_processed_id:
                found_last = True
        if not found_last:
            # Last processed ID not in this batch — process all
            print(f"Warning: last processed ID {last_processed_id} not found in batch, processing all")
            new_messages = messages
    else:
        new_messages = messages

    if not new_messages:
        print("No new messages to process")
        return

    print(f"Processing {len(new_messages)} new message(s)")

    if args.debug:
        print("=== RAW MESSAGE DUMP ===")
        for i, msg in enumerate(new_messages):
            print(f"--- Message {i} ---")
            print(json.dumps(msg, indent=2, default=str))
        print("=== END RAW MESSAGE DUMP ===")

    # Group by date; carry message id + attachments through so we can download per-entry
    by_date: dict[str, list[tuple[datetime, str, str, list[dict]]]] = defaultdict(list)
    for msg in new_messages:
        dt = parse_timestamp(msg["created_at"])
        date_str = dt.strftime("%Y-%m-%d")
        text = one_sentence_per_line(normalize_quotes(msg.get("content") or ""))
        attachments = msg.get("attachments") or []
        by_date[date_str].append((dt, msg["id"], text, attachments))

    # Create/update log files
    modified_files: list[Path] = []
    for date_str in sorted(by_date.keys()):
        rows = by_date[date_str]
        first_msg_dt = rows[0][0]
        has_attachments = any(atts for _, _, _, atts in rows)

        entries: list[str] = []
        for _, mid, text, atts in rows:
            attachment_md = process_attachments(date_str, mid, atts, dry_run=args.dry_run)
            entries.append(render_entry(text, attachment_md))

        log_file = create_or_update_log(
            date_str, entries, first_msg_dt, has_attachments=has_attachments, dry_run=args.dry_run
        )
        modified_files.append(log_file)

    # Run fix-typos on each modified file
    if not args.dry_run and not args.skip_fix_typos:
        for f in modified_files:
            fix_typos(f)

    # Update state
    if not args.dry_run:
        state["last_processed_id"] = new_messages[-1]["id"]
        state["last_run"] = datetime.now(LOCAL_TZ).isoformat()
        save_state(state)
        print(f"State updated. Last processed: {state['last_processed_id']}")


if __name__ == "__main__":
    main()
