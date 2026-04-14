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


def create_or_update_log(date_str: str, entries: list[str], first_msg_dt: datetime, dry_run: bool = False) -> Path:
    year, month, day = date_str.split("-")
    log_dir = LOGS_DIR / year / month
    log_file = log_dir / f"{day}.mdx"

    if log_file.exists():
        existing = log_file.read_text()
        # Append new entries separated by ---
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
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file.write_text(new_content)
        print(f"Wrote {log_file}")

    return log_file


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

    # Group by date
    by_date: dict[str, list[tuple[datetime, str]]] = defaultdict(list)
    for msg in new_messages:
        dt = parse_timestamp(msg["created_at"])
        date_str = dt.strftime("%Y-%m-%d")
        by_date[date_str].append((dt, one_sentence_per_line(normalize_quotes(msg["content"]))))

    # Create/update log files
    modified_files: list[Path] = []
    for date_str in sorted(by_date.keys()):
        pairs = by_date[date_str]
        first_msg_dt = pairs[0][0]
        entries = [content for _, content in pairs]
        log_file = create_or_update_log(date_str, entries, first_msg_dt, dry_run=args.dry_run)
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
