#!/usr/bin/env python3

"""Discover and optionally send Webmentions for local link posts.

Webmention endpoint discovery follows the standard order:

1. an HTTP ``Link`` header with ``rel=webmention``
2. the first HTML ``<link rel="webmention">`` or
   ``<a rel="webmention">`` element in document order

The command is a dry run unless ``--send`` is explicitly supplied. In its
default mode it only considers link posts created after the tracked
``sendAfter`` baseline, so the initial Raindrop import is not backfilled by
accident.

Examples:
    mise run link-webmentions
    mise run link-webmentions -- --target https://example.com/post
    mise run link-webmentions -- --backfill --limit 5
    mise run link-webmentions -- --send
"""

from __future__ import annotations

import argparse
import ipaddress
import json
import os
import re
import socket
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from email.message import Message
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, Mapping, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urljoin, urlsplit
from urllib.request import (
    HTTPRedirectHandler,
    Request,
    build_opener,
)


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_LINKS_DIR = ROOT / "src" / "content" / "links"
DEFAULT_STATE_FILE = ROOT / "scripts" / "link_webmentions_state.json"
DEFAULT_SITE_URL = "https://www.danielcorin.com"
DEFAULT_TIMEOUT = 15.0
DEFAULT_SEND_DELAY = 1.0
MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
MAX_RESPONSE_BYTES = 64 * 1024
USER_AGENT = "thought-eddies-webmention-sender/1.0 (+https://www.danielcorin.com/)"
WEBMENTION_RELS = {
    "webmention",
    "http://webmention.org/",
    "https://webmention.org/",
}

FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---(?:\s*\n|\Z)", re.DOTALL)


class WebmentionError(RuntimeError):
    """A user-facing Webmention processing error."""


@dataclass(frozen=True)
class LinkPost:
    path: Path | None
    source: str
    target: str
    created_at: datetime | None


@dataclass(frozen=True)
class Document:
    final_url: str
    status: int
    headers: Message
    body: bytes

    @property
    def text(self) -> str:
        charset = self.headers.get_content_charset() or "utf-8"
        try:
            return self.body.decode(charset, errors="replace")
        except LookupError:
            return self.body.decode("utf-8", errors="replace")


@dataclass(frozen=True)
class Endpoint:
    url: str
    discovered_via: str


def parse_datetime(value: str, label: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError as error:
        raise WebmentionError(f"Invalid {label} timestamp: {value}") from error
    if parsed.tzinfo is None:
        raise WebmentionError(f"{label} timestamp must include a timezone: {value}")
    return parsed


def frontmatter_value(frontmatter: str, field: str) -> str | None:
    match = re.search(rf"^{re.escape(field)}:\s*(.*?)\s*$", frontmatter, re.MULTILINE)
    if not match:
        return None
    raw = match.group(1)
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        value = raw
    return str(value)


def source_url_for_path(path: Path, links_dir: Path, site_url: str) -> str:
    relative = path.relative_to(links_dir).with_suffix("").as_posix()
    encoded_path = quote(relative, safe="/")
    return urljoin(site_url.rstrip("/") + "/", f"links/{encoded_path}/")


def load_link_posts(links_dir: Path, site_url: str) -> list[LinkPost]:
    posts: list[LinkPost] = []
    if not links_dir.exists():
        raise WebmentionError(f"Link-post directory does not exist: {links_dir}")

    paths = sorted((*links_dir.rglob("*.md"), *links_dir.rglob("*.mdx")))
    for path in paths:
        content = path.read_text(encoding="utf-8")
        match = FRONTMATTER_RE.match(content)
        if not match:
            print(f"Skipping {path}: no frontmatter", file=sys.stderr)
            continue
        frontmatter = match.group(1)
        if (frontmatter_value(frontmatter, "draft") or "false").lower() == "true":
            continue

        target = frontmatter_value(frontmatter, "target")
        created = frontmatter_value(frontmatter, "createdAt")
        if not target or not created:
            print(f"Skipping {path}: target or createdAt is missing", file=sys.stderr)
            continue

        validate_http_url(target)
        posts.append(
            LinkPost(
                path=path,
                source=source_url_for_path(path, links_dir, site_url),
                target=target,
                created_at=parse_datetime(created, f"createdAt in {path}"),
            )
        )

    return sorted(
        posts,
        key=lambda post: post.created_at or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )


def validate_http_url(url: str) -> None:
    parsed = urlsplit(url)
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname:
        raise WebmentionError(f"Expected an absolute HTTP(S) URL, got: {url}")
    if parsed.username is not None or parsed.password is not None:
        raise WebmentionError(f"URLs containing credentials are not allowed: {url}")


def validate_public_url(url: str) -> None:
    """Reject loopback/private destinations before making an outbound request."""
    validate_http_url(url)
    parsed = urlsplit(url)
    assert parsed.hostname is not None
    port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
    try:
        addresses = socket.getaddrinfo(parsed.hostname, port, type=socket.SOCK_STREAM)
    except socket.gaierror as error:
        raise WebmentionError(f"Could not resolve {parsed.hostname}: {error}") from error
    if not addresses:
        raise WebmentionError(f"Could not resolve {parsed.hostname}")

    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global:
            raise WebmentionError(
                f"Refusing to request non-public address {ip} for {parsed.hostname}"
            )


class PublicOnlyRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        validate_public_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def read_limited(response, limit: int) -> bytes:  # noqa: ANN001
    body = response.read(limit + 1)
    if len(body) > limit:
        raise WebmentionError(f"Response exceeded the {limit}-byte safety limit")
    return body


def request_document(url: str, timeout: float) -> Document:
    validate_public_url(url)
    request = Request(
        url,
        headers={
            "Accept": "text/html, application/xhtml+xml;q=0.9, */*;q=0.1",
            "User-Agent": USER_AGENT,
        },
    )
    opener = build_opener(PublicOnlyRedirectHandler())
    try:
        with opener.open(request, timeout=timeout) as response:
            return Document(
                final_url=response.geturl(),
                status=response.status,
                headers=response.headers,
                body=read_limited(response, MAX_DOCUMENT_BYTES),
            )
    except HTTPError as error:
        raise WebmentionError(f"GET {url} returned HTTP {error.code}") from error
    except (URLError, TimeoutError, OSError) as error:
        raise WebmentionError(f"GET {url} failed: {error}") from error


def split_link_header(value: str) -> list[str]:
    """Split RFC-style Link values without splitting quoted commas."""
    parts: list[str] = []
    start = 0
    in_angle = False
    in_quote = False
    escaped = False
    for index, character in enumerate(value):
        if escaped:
            escaped = False
            continue
        if character == "\\" and in_quote:
            escaped = True
        elif character == '"':
            in_quote = not in_quote
        elif character == "<" and not in_quote:
            in_angle = True
        elif character == ">" and not in_quote:
            in_angle = False
        elif character == "," and not in_quote and not in_angle:
            parts.append(value[start:index].strip())
            start = index + 1
    parts.append(value[start:].strip())
    return [part for part in parts if part]


def split_parameters(value: str) -> list[str]:
    parts: list[str] = []
    start = 0
    in_quote = False
    escaped = False
    for index, character in enumerate(value):
        if escaped:
            escaped = False
            continue
        if character == "\\" and in_quote:
            escaped = True
        elif character == '"':
            in_quote = not in_quote
        elif character == ";" and not in_quote:
            parts.append(value[start:index].strip())
            start = index + 1
    parts.append(value[start:].strip())
    return [part for part in parts if part]


def is_webmention_rel(value: str) -> bool:
    return any(token.lower() in WEBMENTION_RELS for token in value.split())


def link_header_endpoints(headers: Mapping[str, str] | Message) -> Iterable[str]:
    get_all = getattr(headers, "get_all", None)
    if callable(get_all):
        values: Sequence[str] = get_all("Link", [])
    else:
        value = headers.get("Link")
        values = [value] if value else []

    for value in values:
        for entry in split_link_header(value):
            match = re.match(r"^\s*<([^>]*)>(.*)$", entry)
            if not match:
                continue
            href, parameter_text = match.groups()
            rel_values: list[str] = []
            for parameter in split_parameters(parameter_text.lstrip(";")):
                name, separator, raw_value = parameter.partition("=")
                if separator and name.strip().lower() == "rel":
                    rel_values.append(raw_value.strip().strip('"'))
            if any(is_webmention_rel(rel) for rel in rel_values):
                yield href


class EndpointHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.endpoints: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() not in {"link", "a"}:
            return
        attributes = {name.lower(): value or "" for name, value in attrs}
        if not is_webmention_rel(attributes.get("rel", "")):
            return
        href = attributes.get("href", "").strip()
        if not href:
            return
        self.endpoints.append((tag.lower(), href))


def resolve_http_candidate(base_url: str, candidate: str) -> str | None:
    resolved = urljoin(base_url, candidate)
    try:
        validate_http_url(resolved)
    except WebmentionError:
        return None
    return resolved


def discover_endpoint_in_document(document: Document) -> Endpoint | None:
    for candidate in link_header_endpoints(document.headers):
        resolved = resolve_http_candidate(document.final_url, candidate)
        if resolved:
            return Endpoint(resolved, "HTTP Link header")

    parser = EndpointHTMLParser()
    parser.feed(document.text)
    for tag, candidate in parser.endpoints:
        resolved = resolve_http_candidate(document.final_url, candidate)
        if resolved:
            return Endpoint(resolved, f"HTML <{tag}>")
    return None


def discover_endpoint(target: str, timeout: float) -> Endpoint | None:
    document = request_document(target, timeout)
    endpoint = discover_endpoint_in_document(document)
    if endpoint:
        validate_public_url(endpoint.url)
    return endpoint


class OutboundLinkHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() not in {"a", "area", "link"}:
            return
        attributes = {name.lower(): value or "" for name, value in attrs}
        href = attributes.get("href", "").strip()
        if href:
            self.hrefs.append(href)


def document_links_to(document: Document, target: str) -> bool:
    parser = OutboundLinkHTMLParser()
    parser.feed(document.text)
    return any(urljoin(document.final_url, href) == target for href in parser.hrefs)


def verify_source(source: str, target: str, timeout: float) -> tuple[bool, str]:
    try:
        document = request_document(source, timeout)
    except WebmentionError as error:
        return False, str(error)
    if not document_links_to(document, target):
        return False, "the published source does not contain the target link"
    return True, "published source contains the target link"


def send_webmention(source: str, target: str, endpoint: str, timeout: float) -> int:
    validate_public_url(endpoint)
    request = Request(
        endpoint,
        data=urlencode({"source": source, "target": target}).encode("utf-8"),
        headers={
            "Accept": "application/json, text/plain;q=0.9, */*;q=0.1",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    opener = build_opener(PublicOnlyRedirectHandler())
    try:
        with opener.open(request, timeout=timeout) as response:
            read_limited(response, MAX_RESPONSE_BYTES)
            if not 200 <= response.status < 300:
                raise WebmentionError(
                    f"Webmention endpoint returned HTTP {response.status}"
                )
            return response.status
    except HTTPError as error:
        body = error.read(MAX_RESPONSE_BYTES).decode("utf-8", errors="replace").strip()
        detail = f": {body[:300]}" if body else ""
        raise WebmentionError(
            f"Webmention endpoint returned HTTP {error.code}{detail}"
        ) from error
    except (URLError, TimeoutError, OSError) as error:
        raise WebmentionError(f"POST {endpoint} failed: {error}") from error


def load_state(path: Path) -> dict:
    if not path.exists():
        raise WebmentionError(
            f"State file does not exist: {path}. Add a sendAfter baseline before running."
        )
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise WebmentionError(f"Could not read state file {path}: {error}") from error
    if not isinstance(state, dict) or not isinstance(state.get("mentions", {}), dict):
        raise WebmentionError(f"Invalid Webmention state in {path}")
    state.setdefault("version", 1)
    state.setdefault("mentions", {})
    return state


def save_state(path: Path, state: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def update_result(
    state: dict,
    post: LinkPost,
    status: str,
    endpoint: Endpoint | None = None,
    http_status: int | None = None,
    detail: str | None = None,
) -> None:
    result = {
        "target": post.target,
        "status": status,
        "checkedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    if endpoint:
        result["endpoint"] = endpoint.url
        result["discoveredVia"] = endpoint.discovered_via
    if http_status is not None:
        result["httpStatus"] = http_status
    if detail:
        result["detail"] = detail
    state["mentions"][post.source] = result


def already_processed(state: dict, post: LinkPost) -> bool:
    previous = state["mentions"].get(post.source, {})
    return previous.get("target") == post.target and previous.get("status") in {
        "sent",
        "no-endpoint",
    }


def print_post_header(index: int, total: int, post: LinkPost) -> None:
    print(f"\n[{index}/{total}] {post.target}")
    if post.source:
        print(f"  source: {post.source}")


def process_posts(
    posts: list[LinkPost],
    state: dict,
    *,
    send: bool,
    retry: bool,
    timeout: float,
    send_delay: float,
) -> tuple[dict[str, int], bool]:
    counts = {
        "endpoint-found": 0,
        "would-send": 0,
        "sent": 0,
        "no-endpoint": 0,
        "waiting-source": 0,
        "failed": 0,
        "skipped": 0,
    }
    changed = False
    attempted_post = False

    pending: list[LinkPost] = []
    for post in posts:
        if not retry and post.source and already_processed(state, post):
            counts["skipped"] += 1
            continue
        pending.append(post)

    if not pending:
        print("No unprocessed link posts matched.")
        return counts, changed

    for index, post in enumerate(pending, start=1):
        print_post_header(index, len(pending), post)
        try:
            endpoint = discover_endpoint(post.target, timeout)
        except WebmentionError as error:
            counts["failed"] += 1
            print(f"  discovery: failed ({error})")
            if send and post.source:
                update_result(state, post, "failed", detail=str(error))
                changed = True
            continue

        if not endpoint:
            counts["no-endpoint"] += 1
            print("  endpoint: none advertised")
            print("  result: no Webmention to send; the bookmark still works normally")
            if send and post.source:
                update_result(state, post, "no-endpoint")
                changed = True
            continue

        print(f"  endpoint: {endpoint.url} ({endpoint.discovered_via})")
        counts["endpoint-found"] += 1

        if not post.source:
            print("  result: endpoint discovered (probe only)")
            continue

        source_ready, source_detail = verify_source(post.source, post.target, timeout)
        print(f"  source check: {source_detail}")
        if not source_ready:
            counts["waiting-source"] += 1
            print("  result: waiting for the source page to be deployed")
            if send:
                update_result(
                    state,
                    post,
                    "waiting-source",
                    endpoint=endpoint,
                    detail=source_detail,
                )
                changed = True
            continue

        if not send:
            counts["would-send"] += 1
            print("  result: WOULD SEND (dry run; no POST made)")
            continue

        if attempted_post and send_delay:
            print(f"  rate limit: waiting {send_delay:g}s before POST")
            time.sleep(send_delay)
        attempted_post = True
        try:
            http_status = send_webmention(
                post.source, post.target, endpoint.url, timeout
            )
        except WebmentionError as error:
            counts["failed"] += 1
            print(f"  result: send failed ({error})")
            update_result(state, post, "failed", endpoint=endpoint, detail=str(error))
            changed = True
            continue

        counts["sent"] += 1
        print(f"  result: sent (HTTP {http_status})")
        update_result(
            state, post, "sent", endpoint=endpoint, http_status=http_status
        )
        changed = True

    return counts, changed


def select_artifact_posts(
    posts: list[LinkPost],
    state: dict,
    *,
    since: str | None,
    backfill: bool,
    limit: int | None,
) -> list[LinkPost]:
    if not backfill:
        baseline_value = since or state.get("sendAfter")
        if not baseline_value:
            raise WebmentionError(
                "No sendAfter baseline is configured; use --since or --backfill"
            )
        baseline = parse_datetime(str(baseline_value), "sendAfter")
        posts = [
            post
            for post in posts
            if post.created_at is not None and post.created_at > baseline
        ]
    if limit is not None:
        posts = posts[:limit]
    return posts


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Discover Webmention endpoints for link posts. Dry-run is the default; "
            "use --send to POST."
        )
    )
    parser.add_argument(
        "--send", action="store_true", help="Actually POST Webmentions to discovered endpoints"
    )
    parser.add_argument(
        "--target",
        action="append",
        help="Probe a target URL directly instead of reading local link posts (repeatable)",
    )
    parser.add_argument(
        "--source",
        help="Published source URL for direct --target mode; required there with --send",
    )
    parser.add_argument(
        "--site-url",
        default=os.environ.get("WEBMENTION_SITE_URL", DEFAULT_SITE_URL),
        help=f"Published site base URL (default: {DEFAULT_SITE_URL})",
    )
    parser.add_argument(
        "--links-dir",
        type=Path,
        default=DEFAULT_LINKS_DIR,
        help=f"Local link-post directory (default: {DEFAULT_LINKS_DIR})",
    )
    parser.add_argument(
        "--state-file",
        type=Path,
        default=DEFAULT_STATE_FILE,
        help=f"Tracked send ledger (default: {DEFAULT_STATE_FILE})",
    )
    parser.add_argument(
        "--since", help="Only consider artifacts created after this ISO-8601 timestamp"
    )
    parser.add_argument(
        "--backfill",
        action="store_true",
        help="Include artifacts predating the tracked sendAfter baseline",
    )
    parser.add_argument(
        "--confirm-backfill",
        action="store_true",
        help="Required with --send --backfill to prevent an accidental historical send",
    )
    parser.add_argument(
        "--retry",
        action="store_true",
        help="Recheck items already recorded as sent or lacking an endpoint",
    )
    parser.add_argument("--limit", type=int, help="Process at most this many newest links")
    parser.add_argument(
        "--timeout",
        type=float,
        default=DEFAULT_TIMEOUT,
        help=f"Per-request timeout in seconds (default: {DEFAULT_TIMEOUT:g})",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=DEFAULT_SEND_DELAY,
        help=(
            "Seconds to wait between Webmention POST attempts "
            f"(default: {DEFAULT_SEND_DELAY:g})"
        ),
    )
    args = parser.parse_args()

    if args.limit is not None and args.limit <= 0:
        parser.error("--limit must be greater than zero")
    if args.timeout <= 0:
        parser.error("--timeout must be greater than zero")
    if args.delay < 0:
        parser.error("--delay cannot be negative")
    if args.source and not args.target:
        parser.error("--source is only valid with --target")
    if args.send and args.target and not args.source:
        parser.error("--source is required when combining --send with --target")
    if args.send and args.backfill and not args.confirm_backfill:
        parser.error("--send --backfill also requires --confirm-backfill")
    if args.since and args.backfill:
        parser.error("--since and --backfill cannot be combined")

    try:
        state_path = args.state_file.resolve()
        state = load_state(state_path)

        if args.target:
            posts = []
            for target in args.target:
                validate_http_url(target)
                posts.append(
                    LinkPost(
                        path=None,
                        source=args.source or "",
                        target=target,
                        created_at=None,
                    )
                )
            if args.limit is not None:
                posts = posts[: args.limit]
        else:
            validate_http_url(args.site_url)
            posts = load_link_posts(args.links_dir.resolve(), args.site_url)
            posts = select_artifact_posts(
                posts,
                state,
                since=args.since,
                backfill=args.backfill,
                limit=args.limit,
            )

        mode = "SEND" if args.send else "DRY RUN"
        print(f"Mode: {mode}")
        print(f"Selected: {len(posts)} target(s)")
        counts, changed = process_posts(
            posts,
            state,
            send=args.send,
            retry=args.retry,
            timeout=args.timeout,
            send_delay=args.delay,
        )
        if args.send and changed:
            save_state(state_path, state)
            print(f"\nUpdated state: {state_path}")

    except WebmentionError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(
        "\nSummary: "
        + ", ".join(f"{value} {name}" for name, value in counts.items())
    )
    return 0 if counts["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
