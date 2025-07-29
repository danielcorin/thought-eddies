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


def create_til(category, name):
    """Create a new TIL with the given category and name"""
    slug = slugify(name)
    title = name.replace("-", " ").title()
    category_slug = slugify(category)
    now = datetime.now().isoformat()

    # Create file path
    til_file = Path(f"src/content/til/{category_slug}/{slug}.md")
    til_file.parent.mkdir(parents=True, exist_ok=True)

    # Create frontmatter content
    frontmatter = f"""---
title: "{title}"
createdAt: {now}
updatedAt: {now}
publishedAt: {now}
tags: null
draft: false
---

"""

    # Write the file
    til_file.write_text(frontmatter)

    print(f"Created TIL: {til_file}")

    # Open the file in editor
    editor = 'cursor'
    subprocess.run([editor, str(til_file)])

    return str(til_file)


def main():
    parser = argparse.ArgumentParser(description="Create a new TIL entry")
    parser.add_argument("category", help="Category for the TIL")
    parser.add_argument("name", help="Name of the TIL")

    args = parser.parse_args()
    create_til(args.category, args.name)


if __name__ == "__main__":
    main()