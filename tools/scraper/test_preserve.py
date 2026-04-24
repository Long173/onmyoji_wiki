"""Guard test: đảm bảo preserve role/friendly_name/skill_images/stats.

Chạy: python -m unittest test_preserve
"""
import json
import tempfile
import unittest
from pathlib import Path

from scrape_shikigami import _extract_curated, _load_user_curated


def _extract_one(record: dict) -> dict:
    """Helper: chạy _extract_curated trên 1 record, return dict cho id đó."""
    out: dict[str, dict] = {}
    _extract_curated([record], out)
    return out.get(record.get("id", ""), {})


class TestPreserve(unittest.TestCase):
    def test_preserves_role_list(self):
        e = _extract_one({
            "id": "binh_tuong_mon",
            "name_vi": "Bình Tướng Môn",
            "role": ["attacker", "defender"],
            "friendly_name": [],
            "skills": [],
        })
        self.assertEqual(e["role"], ["attacker", "defender"])

    def test_preserves_friendly_name(self):
        e = _extract_one({
            "id": "seimei",
            "name_vi": "Seimei",
            "friendly_name": ["Seimei trái đào", "Seimei"],
            "skills": [],
        })
        self.assertEqual(e["friendly_name"], ["Seimei trái đào", "Seimei"])

    def test_preserves_skill_images(self):
        e = _extract_one({
            "id": "himiko",
            "name_vi": "Himiko",
            "skills": [
                {"name": "A", "image": "assets/images/skills/himiko_1.webp"},
                {"name": "B", "image": ""},
                {"name": "C", "image": "assets/images/skills/himiko_3.webp"},
            ],
        })
        self.assertEqual(
            e["skill_images"],
            [
                "assets/images/skills/himiko_1.webp",
                "",
                "assets/images/skills/himiko_3.webp",
            ],
        )

    def test_accepts_legacy_string_role(self):
        e = _extract_one({"id": "x", "name_vi": "X", "role": "support", "skills": []})
        self.assertEqual(e["role"], ["support"])

    def test_preserves_stats_with_tier(self):
        e = _extract_one({
            "id": "ibaraki_doji",
            "name_vi": "Ibaraki",
            "stats": {
                "hp": {"value": 10122, "tier": "A"},
                "attack": {"value": 320, "tier": "S"},
                "speed": 109,
                "accuracy": {"value": 0, "tier": ""},
            },
            "skills": [],
        })
        self.assertEqual(e["stats"]["hp"], {"value": 10122, "tier": "A"})
        self.assertEqual(e["stats"]["attack"], {"value": 320, "tier": "S"})
        self.assertEqual(e["stats"]["speed"], {"value": 109, "tier": ""})

    def test_skips_stats_preserve_when_all_empty(self):
        e = _extract_one({
            "id": "x",
            "name_vi": "X",
            "stats": {
                "hp": {"value": 0, "tier": ""},
                "attack": {"value": 0, "tier": ""},
            },
            "skills": [],
        })
        self.assertNotIn("stats", e)

    def test_load_user_curated_reads_all_rarity_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            (tmp_dir / "ssr.json").write_text(
                json.dumps([
                    {"id": "a", "role": ["support"], "skills": []},
                ]),
                encoding="utf-8",
            )
            (tmp_dir / "sp.json").write_text(
                json.dumps([
                    {"id": "b", "role": ["attacker"], "skills": []},
                ]),
                encoding="utf-8",
            )
            out = _load_user_curated(tmp_dir)
            self.assertIn("a", out)
            self.assertIn("b", out)
            self.assertEqual(out["a"]["role"], ["support"])
            self.assertEqual(out["b"]["role"], ["attacker"])

    def test_load_missing_dir_returns_empty(self):
        out = _load_user_curated(Path("/tmp/__does_not_exist_scraper_test__"))
        self.assertEqual(out, {})


if __name__ == "__main__":
    unittest.main()
