import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import sync_logs as sync


def raw_journal_entry(**overrides):
    entry = {
        "id": "11B51FB9-DFBA-4B48-941D-56F755756388",
        "journalName": "Thought Eddies",
        "body": "First thought. Second thought.",
        "entryDate": "2026-09-11T17:29:37Z",
        "createdAt": "2026-09-11T17:29:37Z",
        "attachments": [],
        "tags": [],
        "context": {"timeZoneIdentifier": "America/New_York"},
        "location": {
            "address": "382 7th St, Brooklyn, NY  11215, United States",
            "latitude": 40.66,
            "longitude": -73.98,
            "placeName": "382 7th St",
        },
    }
    entry.update(overrides)
    return entry


class CityFromAddressTests(unittest.TestCase):
    def test_us_street_address(self):
        self.assertEqual(
            sync.city_from_address("382 7th St, Brooklyn, NY  11215, United States"), "Brooklyn"
        )

    def test_us_city_only(self):
        self.assertEqual(sync.city_from_address("Brooklyn, NY 11215, United States"), "Brooklyn")

    def test_aliases_follow_site_convention(self):
        self.assertEqual(sync.city_from_address("1 Main St, New York, NY 10001, United States"), "NYC")
        self.assertEqual(
            sync.city_from_address("1 Market St, San Francisco, CA 94105, United States"), "SF"
        )

    def test_international(self):
        self.assertEqual(sync.city_from_address("Shibuya, Tokyo, Japan"), "Tokyo")

    def test_unusable(self):
        self.assertIsNone(sync.city_from_address(None))
        self.assertIsNone(sync.city_from_address("United States"))
        self.assertIsNone(sync.city_from_address("NY 11215, United States"))


class JournalEntryTests(unittest.TestCase):
    def test_converts_to_local_time_and_city(self):
        entry = sync.journal_entry(raw_journal_entry())
        self.assertEqual(entry.source, "journal")
        self.assertEqual(entry.city, "Brooklyn")
        self.assertEqual(entry.dt, datetime(2026, 9, 11, 13, 29, 37, tzinfo=ZoneInfo("America/New_York")))
        self.assertEqual(entry.text, "First thought.\nSecond thought.")

    def test_no_location_or_context(self):
        entry = sync.journal_entry(raw_journal_entry(location=None, context=None))
        self.assertIsNone(entry.city)
        self.assertEqual(entry.dt.tzinfo, sync.LOCAL_TZ)


class AddLocationTests(unittest.TestCase):
    content = "---\ndate: '2026-09-11T13:29:37-04:00'\ntitle: '2026-09-11'\ndraft: false\ntags: []\n---\n\nBody\n"

    def test_inserts_location(self):
        result = sync.add_location(self.content, "Brooklyn")
        self.assertIn("tags: []\nlocation: 'Brooklyn'\n---\n\nBody", result)

    def test_keeps_existing_location(self):
        existing = self.content.replace("tags: []\n", "tags: []\nlocation: 'NYC'\n")
        self.assertEqual(sync.add_location(existing, "Brooklyn"), existing)

    def test_no_city_is_noop(self):
        self.assertEqual(sync.add_location(self.content, None), self.content)


class CreateOrUpdateLogTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.original_logs_dir = sync.LOGS_DIR
        sync.LOGS_DIR = Path(self.tmp.name)
        self.addCleanup(setattr, sync, "LOGS_DIR", self.original_logs_dir)
        self.dt = datetime(2026, 9, 11, 13, 29, 37, tzinfo=ZoneInfo("America/New_York"))

    def test_new_log_includes_location(self):
        path = sync.create_or_update_log("2026-09-11", ["Hello"], self.dt, False, city="Brooklyn")
        self.assertEqual(
            path.read_text(),
            "---\ndate: '2026-09-11T13:29:37-04:00'\ntitle: '2026-09-11'\ndraft: false\ntags: []\nlocation: 'Brooklyn'\n---\n\nHello\n",
        )

    def test_new_log_without_city(self):
        path = sync.create_or_update_log("2026-09-11", ["Hello"], self.dt, False)
        self.assertNotIn("location", path.read_text())

    def test_append_adds_location_and_entries(self):
        sync.create_or_update_log("2026-09-11", ["One"], self.dt, False)
        path = sync.create_or_update_log("2026-09-11", ["Two", "Three"], self.dt, False, city="Brooklyn")
        self.assertEqual(
            path.read_text(),
            "---\ndate: '2026-09-11T13:29:37-04:00'\ntitle: '2026-09-11'\ndraft: false\ntags: []\nlocation: 'Brooklyn'\n---\n\nOne\n\n---\n\nTwo\n\n---\n\nThree\n",
        )


class JournalAttachmentTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        sync.LOGS_DIR = Path(self.tmp.name) / "logs"
        self.addCleanup(setattr, sync, "LOGS_DIR", sync.LOGS_DIR)

    def test_short_id_matches_export_naming(self):
        self.assertEqual(sync.journal_short_id("572B876E-1111-2222-3333-444444444444"), "572b876e")

    def test_copies_exported_file_and_renders_image(self):
        export_dir = Path(self.tmp.name) / "export" / "Thought Eddies" / "attachments"
        export_dir.mkdir(parents=True)
        (export_dir / "572b876e-pasted-image.png").write_bytes(b"png")

        class FakeExport:
            def find(self, attachment_id):
                return export_dir / "572b876e-pasted-image.png"

        original = sync.optimize_png
        sync.optimize_png = lambda path: None
        self.addCleanup(setattr, sync, "optimize_png", original)

        attachments = [
            {"id": "572B876E-1111-2222-3333-444444444444", "filename": "pasted-image.png", "contentType": "image/png"}
        ]
        lines = sync.process_journal_attachments("2026-09-11", attachments, FakeExport(), dry_run=False)
        dest = sync.LOGS_DIR / "2026" / "09" / "11" / "images" / "572b876e-pasted-image.png"
        self.assertEqual(dest.read_bytes(), b"png")
        self.assertEqual(lines, ["![pasted image](images/572b876e-pasted-image.png)"])

    def test_dry_run_renders_without_export(self):
        class ExplodingExport:
            def find(self, attachment_id):
                raise AssertionError("export should not run in dry-run")

        attachments = [{"id": "572B876E-1111-2222-3333-444444444444", "filename": "a.png"}]
        lines = sync.process_journal_attachments("2026-09-11", attachments, ExplodingExport(), dry_run=True)
        self.assertEqual(lines, ["![a](images/572b876e-a.png)"])


if __name__ == "__main__":
    unittest.main()
