#!/usr/bin/env python3
"""
Manage standard.site records on AT Protocol.

Usage:
  python scripts/standard_site.py setup --handle danielcorin.com --password <app-password>
  python scripts/standard_site.py sync --handle danielcorin.com --password <app-password>
"""

import argparse
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

SITE_URL = "https://www.danielcorin.com"
PUBLICATION_NAME = "Thought Eddies"
PUBLICATION_DESCRIPTION = "An Experimental Digital Garden"

CONTENT_DIR = Path(__file__).parent.parent / "src" / "content" / "posts"


def api_request(url, data=None, token=None):
    """Make an HTTP request and return parsed JSON."""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method="POST" if body else "GET")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def resolve_pds(handle):
    """Resolve a handle to its DID and PDS endpoint."""
    url = f"https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle={handle}"
    result = api_request(url)
    did = result["did"]

    doc = api_request(f"https://plc.directory/{did}")
    for service in doc.get("service", []):
        if service.get("id") == "#atproto_pds":
            return did, service["serviceEndpoint"]

    print(f"Error: could not find PDS endpoint for {did}", file=sys.stderr)
    sys.exit(1)


def create_session(pds, handle, password):
    """Create an authenticated session and return the access token."""
    result = api_request(
        f"{pds}/xrpc/com.atproto.server.createSession",
        {"identifier": handle, "password": password},
    )
    return result["accessJwt"], result["did"]


def get_record(pds, did, collection, rkey):
    """Get a single record, returning None if not found."""
    url = f"{pds}/xrpc/com.atproto.repo.getRecord?repo={did}&collection={collection}&rkey={rkey}"
    try:
        return api_request(url)
    except urllib.error.HTTPError as e:
        if e.code == 404 or e.code == 400:
            return None
        raise


def list_records(pds, did, collection):
    """List all records in a collection."""
    records = []
    cursor = None
    while True:
        url = f"{pds}/xrpc/com.atproto.repo.listRecords?repo={did}&collection={collection}&limit=100"
        if cursor:
            url += f"&cursor={cursor}"
        result = api_request(url)
        records.extend(result.get("records", []))
        cursor = result.get("cursor")
        if not cursor:
            break
    return records


def put_record(pds, token, did, collection, rkey, record):
    """Create or update a record."""
    return api_request(
        f"{pds}/xrpc/com.atproto.repo.putRecord",
        {
            "repo": did,
            "collection": collection,
            "rkey": rkey,
            "record": record,
        },
        token=token,
    )


def slugify(text):
    """Convert text to a TID-safe rkey."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9-]", "-", text)
    text = re.sub(r"-+", "-", text)
    text = text.strip("-")
    return text[:512]


def parse_frontmatter(filepath):
    """Parse YAML frontmatter from a markdown file."""
    text = filepath.read_text()
    match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return None

    fm = {}
    for line in match.group(1).split("\n"):
        line = line.strip()
        if ":" not in line or line.startswith("#"):
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if value.lower() == "true":
            value = True
        elif value.lower() == "false":
            value = False
        fm[key] = value
    return fm


def get_published_posts():
    """Get all published posts with their metadata."""
    posts = []
    for filepath in sorted(CONTENT_DIR.rglob("*.md")) + sorted(CONTENT_DIR.rglob("*.mdx")):
        if filepath.name.startswith("_"):
            continue
        fm = parse_frontmatter(filepath)
        if not fm or fm.get("draft", True) is True:
            continue

        # Derive the post ID (path relative to content dir, without extension)
        rel = filepath.relative_to(CONTENT_DIR)
        # For index.md/index.mdx files, use the parent directory
        if rel.name.startswith("index."):
            post_id = str(rel.parent)
        else:
            post_id = str(rel.with_suffix(""))

        posts.append({
            "id": post_id,
            "path": f"/posts/{post_id}/",
            "title": fm.get("title", ""),
            "description": fm.get("description", ""),
            "createdAt": fm.get("createdAt", ""),
            "updatedAt": fm.get("updatedAt", ""),
            "tags": [t.strip() for t in fm.get("tags", "").split(",") if t.strip()] if isinstance(fm.get("tags"), str) else [],
            "bsky": fm.get("bsky", ""),
        })
    return posts


def cmd_setup(args):
    """Create the publication record."""
    handle = args.handle
    password = args.password or os.environ.get("BSKY_APP_PASSWORD")
    if not password:
        print("Error: --password or BSKY_APP_PASSWORD env var required", file=sys.stderr)
        sys.exit(1)

    print(f"Resolving PDS for {handle}...")
    did, pds = resolve_pds(handle)
    print(f"DID: {did}")
    print(f"PDS: {pds}")

    print("Authenticating...")
    token, did = create_session(pds, handle, password)

    rkey = "self"
    record = {
        "$type": "site.standard.publication",
        "url": SITE_URL,
        "name": PUBLICATION_NAME,
        "description": PUBLICATION_DESCRIPTION,
    }

    print("Creating publication record...")
    result = put_record(pds, token, did, "site.standard.publication", rkey, record)
    at_uri = result["uri"]
    print(f"\nPublication AT-URI:\n{at_uri}")
    print("\nUpdate the AT_URI in src/pages/.well-known/site.standard.publication.ts")


def cmd_sync(args):
    """Sync published posts as document records."""
    handle = args.handle
    password = args.password or os.environ.get("BSKY_APP_PASSWORD")
    if not password:
        print("Error: --password or BSKY_APP_PASSWORD env var required", file=sys.stderr)
        sys.exit(1)

    print(f"Resolving PDS for {handle}...")
    did, pds = resolve_pds(handle)

    print("Authenticating...")
    token, did = create_session(pds, handle, password)

    # Get the publication AT-URI
    pub_record = get_record(pds, did, "site.standard.publication", "self")
    if not pub_record:
        print("Error: no publication record found. Run 'setup' first.", file=sys.stderr)
        sys.exit(1)
    pub_uri = pub_record["uri"]
    print(f"Publication: {pub_uri}")

    # Get existing document records
    existing = list_records(pds, did, "site.standard.document")
    existing_by_path = {r["value"].get("path"): r for r in existing}
    print(f"Existing documents: {len(existing)}")

    # Get published posts
    posts = get_published_posts()
    print(f"Published posts: {len(posts)}")

    created = 0
    updated = 0
    skipped = 0

    for post in posts:
        rkey = slugify(post["id"])
        record = {
            "$type": "site.standard.document",
            "site": pub_uri,
            "title": post["title"],
            "path": post["path"],
            "publishedAt": post["createdAt"],
        }

        if post["description"]:
            record["description"] = post["description"]
        if post["updatedAt"]:
            record["updatedAt"] = post["updatedAt"]
        if post["tags"]:
            record["tags"] = post["tags"]

        # Check if record exists and matches
        existing_rec = existing_by_path.get(post["path"])
        if existing_rec:
            existing_val = existing_rec["value"]
            if (
                existing_val.get("title") == record["title"]
                and existing_val.get("description") == record.get("description")
                and existing_val.get("publishedAt") == record["publishedAt"]
            ):
                skipped += 1
                continue
            updated += 1
        else:
            created += 1

        put_record(pds, token, did, "site.standard.document", rkey, record)
        print(f"  {'Updated' if existing_rec else 'Created'}: {post['title']}")

    print(f"\nDone: {created} created, {updated} updated, {skipped} unchanged")


def main():
    parser = argparse.ArgumentParser(description="Manage standard.site records")
    subparsers = parser.add_subparsers(dest="command", required=True)

    for name, help_text in [("setup", "Create publication record"), ("sync", "Sync posts as documents")]:
        sub = subparsers.add_parser(name, help=help_text)
        sub.add_argument("--handle", required=True, help="AT Protocol handle (e.g., danielcorin.com)")
        sub.add_argument("--password", help="App password (or set BSKY_APP_PASSWORD env var)")

    args = parser.parse_args()
    {"setup": cmd_setup, "sync": cmd_sync}[args.command](args)


if __name__ == "__main__":
    main()
