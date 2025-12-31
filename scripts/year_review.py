#!/usr/bin/env python3
"""
Generate year-in-review statistics for blog content.

Usage:
    python scripts/year_review.py [year]

If no year is provided, defaults to current year.
"""
from pathlib import Path
import datetime
import sys
import frontmatter


def get_post_stats(md_file: Path) -> dict:
    """Extract metadata and word count from a markdown file."""
    with md_file.open() as f:
        post = frontmatter.load(f)
        # Handle different date field names used across content types
        date = (
            post.metadata.get("createdAt")
            or post.metadata.get("publishedAt")
            or post.metadata.get("date")
        )
        return {
            "title": post.metadata.get("title", "Untitled"),
            "date": date,
            "file": md_file,
            "word_count": len(post.content.split()),
            "draft": post.metadata.get("draft", True),
        }


def is_target_year(post_date, year: int) -> bool:
    """Check if a post date matches the target year."""
    if post_date is None:
        return False
    date_str = str(post_date)
    return f"{year}-" in date_str or f"{year}/" in date_str


def should_include_file(file_path: Path) -> bool:
    """Determine if a file should be included in stats."""
    # Exclude files starting with underscore (like _level_2.md, _source.md)
    if file_path.name.startswith("_"):
        return False
    return True


def get_posts_for_year(year: int) -> dict:
    """Scan content directories and gather posts for the given year."""
    content_dir = Path("src/content")
    posts_by_category = {}

    # Include both .md and .mdx files
    for pattern in ["**/*.md", "**/*.mdx"]:
        for md_file in content_dir.glob(pattern):
            if not should_include_file(md_file):
                continue

            relative_path = md_file.relative_to(content_dir)
            category = relative_path.parts[0] if relative_path.parts else "uncategorized"

            # Skip certain categories
            if category in ["feeds", "rss", "about", "home"]:
                continue

            try:
                post_stats = get_post_stats(md_file)

                # Skip drafts
                if post_stats["draft"]:
                    continue

                # Check if post is from target year
                if not is_target_year(post_stats["date"], year):
                    continue

                if category not in posts_by_category:
                    posts_by_category[category] = []
                posts_by_category[category].append(post_stats)

            except (ValueError, AttributeError, KeyError) as e:
                print(f"Warning: Could not parse {md_file}: {e}")
                continue

    return posts_by_category


def get_category_stats(category_posts: list) -> tuple[int, int]:
    """Calculate total posts and words for a category."""
    post_count = len(category_posts)
    word_count = sum(post["word_count"] for post in category_posts)
    return post_count, word_count


# Category display configuration
CATEGORY_CONFIG = {
    "projects": ("🏗️ Projects", "/projects"),
    "now": ("📍 Now", "/now"),
    "posts": ("📖 Posts", "/posts"),
    "garden": ("🌱 Garden", "/garden"),
    "logs": ("✏️ Logs", "/logs"),
    "til": ("📝 Today I Learned", "/til"),
    "uses": ("🧰 Uses", "/uses"),
}

# Display order for categories
CATEGORY_ORDER = ["projects", "now", "posts", "garden", "logs", "til", "uses"]


def generate_year_review(year: int = None):
    """Generate the year review statistics."""
    if year is None:
        year = datetime.datetime.now().year

    print(f"\n📊 Year in Review: {year}\n")

    posts = get_posts_for_year(year)

    if not posts:
        print(f"No published posts found for {year}")
        return

    total_posts = 0
    total_words = 0

    # Build table rows
    rows = []
    for category in CATEGORY_ORDER:
        if category not in posts:
            continue
        category_posts = posts[category]
        post_count, word_count = get_category_stats(category_posts)
        total_posts += post_count
        total_words += word_count

        display_name, url = CATEGORY_CONFIG.get(category, (category.title(), f"/{category}"))
        rows.append((display_name, url, post_count, word_count))

    # Handle any categories not in CATEGORY_ORDER
    for category, category_posts in posts.items():
        if category in CATEGORY_ORDER:
            continue
        post_count, word_count = get_category_stats(category_posts)
        total_posts += post_count
        total_words += word_count
        rows.append((category.title(), f"/{category}", post_count, word_count))

    # Output markdown table
    print("| Category | Posts | Words |")
    print("| --- | --- | --- |")
    for display_name, url, post_count, word_count in rows:
        print(f"| [{display_name}]({url}) | {post_count} | {word_count:,} |")
    print(f"| **Total** | **{total_posts}** | **{total_words:,}** |")

    print("\n✨ Stats generated successfully!\n")


if __name__ == "__main__":
    year = None
    if len(sys.argv) > 1:
        try:
            year = int(sys.argv[1])
        except ValueError:
            print(f"Invalid year: {sys.argv[1]}")
            sys.exit(1)
    generate_year_review(year)
