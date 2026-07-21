import sys
import tempfile
import unittest
from email.message import Message
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import send_link_webmentions as sender


def document(
    url="https://example.com/articles/post",
    *,
    html="",
    link_headers=(),
):
    headers = Message()
    headers["Content-Type"] = "text/html; charset=utf-8"
    for value in link_headers:
        headers["Link"] = value
    return sender.Document(url, 200, headers, html.encode())


class EndpointDiscoveryTests(unittest.TestCase):
    def test_http_link_header_wins_and_resolves_relative_url(self):
        page = document(
            html='<link rel="webmention" href="/from-html">',
            link_headers=[
                '<alternate>; rel="alternate", </from-header>; rel="webmention"'
            ],
        )

        endpoint = sender.discover_endpoint_in_document(page)

        self.assertIsNotNone(endpoint)
        self.assertEqual(endpoint.url, "https://example.com/from-header")
        self.assertEqual(endpoint.discovered_via, "HTTP Link header")

    def test_first_html_endpoint_wins_in_document_order(self):
        page = document(
            html=(
                '<a rel="webmention" href="/from-anchor">endpoint</a>'
                '<link rel="webmention" href="https://mentions.example/receive">'
            )
        )

        endpoint = sender.discover_endpoint_in_document(page)

        self.assertIsNotNone(endpoint)
        self.assertEqual(endpoint.url, "https://example.com/from-anchor")
        self.assertEqual(endpoint.discovered_via, "HTML <a>")

    def test_page_without_endpoint_returns_none(self):
        self.assertIsNone(
            sender.discover_endpoint_in_document(
                document(html='<a href="https://example.net">ordinary link</a>')
            )
        )

    def test_source_link_check_requires_an_exact_target_including_fragment(self):
        page = document(
            url="https://source.example/links/a/",
            html='<a href="https://target.example/post#section">bookmark</a>',
        )

        self.assertTrue(
            sender.document_links_to(page, "https://target.example/post#section")
        )
        self.assertFalse(sender.document_links_to(page, "https://target.example/post"))


class LinkArtifactTests(unittest.TestCase):
    def test_loads_artifact_and_builds_its_published_source_url(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            links_dir = Path(temporary_directory)
            artifact = links_dir / "2026/07/readable-title.md"
            artifact.parent.mkdir(parents=True)
            artifact.write_text(
                """---
title: "Readable title"
target: "https://target.example/post"
createdAt: 2026-07-21T14:00:00+00:00
draft: false
---
""",
                encoding="utf-8",
            )

            posts = sender.load_link_posts(links_dir, "https://site.example")

            self.assertEqual(len(posts), 1)
            self.assertEqual(
                posts[0].source,
                "https://site.example/links/2026/07/readable-title/",
            )

    def test_send_after_baseline_excludes_the_initial_import(self):
        old = sender.LinkPost(
            None,
            "https://site.example/old",
            "https://target.example/old",
            sender.parse_datetime("2026-07-21T12:00:00Z", "createdAt"),
        )
        new = sender.LinkPost(
            None,
            "https://site.example/new",
            "https://target.example/new",
            sender.parse_datetime("2026-07-21T14:00:00Z", "createdAt"),
        )

        selected = sender.select_artifact_posts(
            [new, old],
            {"sendAfter": "2026-07-21T13:54:31Z"},
            since=None,
            backfill=False,
            limit=None,
        )

        self.assertEqual(selected, [new])


class SendingTests(unittest.TestCase):
    @patch.object(sender.time, "sleep")
    @patch.object(sender, "send_webmention", return_value=202)
    @patch.object(
        sender,
        "verify_source",
        return_value=(True, "published source contains the target link"),
    )
    @patch.object(
        sender,
        "discover_endpoint",
        return_value=sender.Endpoint(
            "https://receiver.example/webmention", "HTML <link>"
        ),
    )
    def test_send_waits_between_post_attempts(
        self, discover, verify, send, sleep
    ):
        posts = [
            sender.LinkPost(
                None,
                f"https://site.example/links/{index}/",
                f"https://target.example/{index}",
                None,
            )
            for index in range(2)
        ]
        state = {"mentions": {}}

        counts, changed = sender.process_posts(
            posts,
            state,
            send=True,
            retry=False,
            timeout=15,
            send_delay=1.5,
        )

        self.assertTrue(changed)
        self.assertEqual(counts["endpoint-found"], 2)
        self.assertEqual(counts["sent"], 2)
        sleep.assert_called_once_with(1.5)


if __name__ == "__main__":
    unittest.main()
