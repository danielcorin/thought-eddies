#!/usr/bin/env python3

import os
import re
import shlex
import shutil
import subprocess
from datetime import datetime
from pathlib import Path


def create_or_open_uses():
    today = datetime.now().astimezone().strftime("%Y-%m-%d")
    base_dir = Path("src/content/uses")
    new_dir = base_dir / today
    new_file = new_dir / "index.mdx"

    if new_file.exists():
        print(f"Opening existing uses page for today: {new_file}")
    else:
        date_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}$")
        existing = sorted(
            (p for p in base_dir.iterdir() if p.is_dir() and date_pattern.match(p.name)),
            key=lambda p: p.name,
        )
        if not existing:
            raise SystemExit(f"No existing uses pages found in {base_dir}")
        latest = existing[-1]

        print(f"Copying {latest} -> {new_dir}")
        shutil.copytree(latest, new_dir)

        content = new_file.read_text()
        content = re.sub(r"^date:\s*.*$", f"date: {today}", content, count=1, flags=re.MULTILINE)
        new_file.write_text(content)

    editor = shlex.split(os.environ.get("EDITOR") or "code")
    subprocess.run([*editor, str(new_file)])


if __name__ == "__main__":
    create_or_open_uses()
