import sys
import tempfile
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import raindrop_links_to_posts as sync


def item(item_id, title, link, created="2026-07-20T12:00:00.000Z", note=""):
    return {
        "_id": item_id,
        "title": title,
        "link": link,
        "created": created,
        "lastUpdate": created,
        "tags": ["reading"],
        "note": note,
    }


class RaindropLinkSyncTests(unittest.TestCase):
    def test_slugify_is_readable_and_bounded(self):
        self.assertEqual(sync.slugify("It's Déjà Vu — Again!"), "its-deja-vu-again")
        self.assertLessEqual(len(sync.slugify("word " * 100)), 80)

    def test_materialize_uses_title_then_domain_for_collisions(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory)
            counts = sync.materialize_items(
                [
                    item(1, "Same title", "https://first.example/post"),
                    item(2, "Same title", "https://second.example/post"),
                ],
                output,
            )

            self.assertEqual(counts["created"], 2)
            self.assertTrue((output / "2026/07/same-title.md").exists())
            self.assertTrue(
                (output / "2026/07/same-title-second-example.md").exists()
            )

    def test_existing_item_updates_without_changing_its_slug(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory)
            sync.materialize_items(
                [item(1, "Original title", "https://example.com/post")], output
            )
            original_path = output / "2026/07/original-title.md"

            counts = sync.materialize_items(
                [
                    item(
                        1,
                        "A completely different title",
                        "https://example.com/post",
                        note="Worth revisiting.",
                    )
                ],
                output,
            )

            self.assertEqual(counts["updated"], 1)
            self.assertTrue(original_path.exists())
            self.assertFalse(
                (output / "2026/07/a-completely-different-title.md").exists()
            )
            self.assertIn("Worth revisiting.", original_path.read_text())


if __name__ == "__main__":
    unittest.main()
