#!/usr/bin/env python3

from datetime import datetime
from pathlib import Path
import subprocess

def create_or_open_log():
    # Get current date and time in local time
    now = datetime.now()
    year = now.strftime("%Y")
    month = now.strftime("%m")
    day = now.strftime("%d")
    timestamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Construct file path
    base_dir = Path("src/content/logs")
    log_dir = base_dir / year / month
    log_file = log_dir / f"{day}.mdx"

    # Create directory if it doesn't exist
    log_dir.mkdir(parents=True, exist_ok=True)

    # Check if file already exists
    if log_file.exists():
        print(f"Opening existing log for today: {log_file}")
    else:
        print(f"Creating new log for today: {log_file}")

        # Create file with frontmatter
        content = f"""---
date: '{timestamp}'
title: '{year}-{month}-{day}'
draft: false
tags: []
---

"""
        log_file.write_text(content)

    # Open the file in editor
    editor = 'cursor'
    subprocess.run([editor, str(log_file)])

if __name__ == "__main__":
    create_or_open_log()
