#!/usr/bin/env python3

import argparse
import re
from datetime import datetime
from pathlib import Path
import subprocess


def slugify(text):
    """Convert text to URL-safe slug"""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    text = text.strip("-")
    return text


def create_post(name):
    """Create a new post with the given name"""
    slug = slugify(name)
    title = name.replace("-", " ").title()
    year = datetime.now().year
    now = datetime.now().isoformat()

    # Create directory path
    post_dir = Path(f"src/content/posts/{year}/{slug}")
    post_dir.mkdir(parents=True, exist_ok=True)

    # Create index.mdx content
    frontmatter = f"""---
title: "{title}"
createdAt: {now}
updatedAt: {now}
description: ""
location: ""
draft: true
---

"""

    # Write the file
    index_file = post_dir / "index.mdx"
    index_file.write_text(frontmatter)

    print(f"Created post: {index_file}")

    # Open the file in editor
    editor = 'cursor'
    subprocess.run([editor, str(index_file)])

    return str(index_file)


def main():
    parser = argparse.ArgumentParser(description="Create a new post")
    parser.add_argument("name", help="Name of the post")

    args = parser.parse_args()
    create_post(args.name)


if __name__ == "__main__":
    main()
