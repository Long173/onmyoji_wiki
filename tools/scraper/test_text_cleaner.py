"""Smoke test cho text_cleaner — chạy: python -m unittest test_text_cleaner"""
import unittest

from text_cleaner import clean_text


class TestCleanText(unittest.TestCase):
    def test_so_sat_glue(self):
        self.assertEqual(
            clean_text("Hệ sốsát thương = 16%"),
            "Hệ số sát thương = 16%",
        )

    def test_camel_case_split(self):
        self.assertEqual(
            clean_text("dụngKỹ năng"),
            "dụng Kỹ năng",
        )

    def test_punct_no_space(self):
        self.assertEqual(
            clean_text("Lv1,sát thương = 100%"),
            "Lv1, sát thương = 100%",
        )

    def test_collapse_whitespace(self):
        self.assertEqual(
            clean_text("  foo   bar\n\nbaz  "),
            "foo bar baz",
        )

    def test_idempotent(self):
        once = clean_text("Hệ sốsát thương")
        twice = clean_text(once)
        self.assertEqual(once, twice)

    def test_empty(self):
        self.assertEqual(clean_text(""), "")
        self.assertEqual(clean_text(None or ""), "")


if __name__ == "__main__":
    unittest.main()
