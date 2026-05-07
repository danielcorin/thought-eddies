#!/usr/bin/env python3

import os
import shlex
import subprocess
from datetime import datetime
from pathlib import Path


def create_or_open_now():
    today = datetime.now().astimezone().strftime("%Y-%m-%d")
    new_dir = Path("src/content/now") / today
    new_file = new_dir / "index.mdx"

    if new_file.exists():
        print(f"Opening existing now page for today: {new_file}")
    else:
        print(f"Creating new now page for today: {new_file}")
        new_dir.mkdir(parents=True, exist_ok=True)
        new_file.write_text(f"---\ndate: {today}\n---\n\n")

    editor = shlex.split(os.environ.get("EDITOR") or "code")
    subprocess.run([*editor, str(new_file)])


if __name__ == "__main__":
    create_or_open_now()
