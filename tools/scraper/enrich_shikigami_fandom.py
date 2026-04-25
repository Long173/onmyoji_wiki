#!/usr/bin/env python3
"""Enrich shikigami data từ Onmyoji Fandom wiki (merge-only, không replace).

Nguồn:
- https://onmyoji.fandom.com/wiki/Shikigami/List/All  — list + portrait image + rarity
- https://onmyoji.fandom.com/wiki/{Name}/Main          — skills + stats tiers

Policy:
- KHÔNG overwrite field user đã điền (name_vi, role, description, stats có giá trị, v.v.)
- Chỉ FILL field rỗng: name_en, image (nếu file không tồn tại), skills[i].image,
  stats.{hp,atk,...} khi value=0 + tier=""
- Thêm record mới nếu fandom có shikigami chưa có trong data hiện tại

Cách dùng:
    cd tools/scraper
    source .venv/bin/activate
    python enrich_shikigami_fandom.py                 # full enrich + tải ảnh
    python enrich_shikigami_fandom.py --skip-images   # chỉ merge metadata
    python enrich_shikigami_fandom.py --dry-run       # preview thay đổi, không ghi
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

try:
    import requests
except ImportError:
    print("Thiếu requests. pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)

API_URL = "https://onmyoji.fandom.com/api.php"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
)
DELAY_SEC = 1.0
TIMEOUT_SEC = 30

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "assets" / "data" / "shikigami"
IMG_DIR = PROJECT_ROOT / "assets" / "images" / "shikigami"
RARITY_DIR = PROJECT_ROOT / "assets" / "images" / "rarity"

RARITIES = ["SSR", "SR", "SP", "R", "N"]
RARITY_FILES = {r: f"{r.lower()}.json" for r in RARITIES}
STAT_KEYS = ("hp", "attack", "defense", "speed", "crit_rate", "crit_dmg",
             "accuracy", "resist")

# Fandom StatBox field name → key internal
_STATBOX_MAP = {
    "hp": ("HpGr1", "Hp1"),
    "attack": ("AtkGr1", "Atk1"),
    "defense": ("DefGr1", "Def1"),
    "speed": ("SpdGr1", "Spd1"),
    "crit_rate": ("CritGr1", "Crit1"),
    "crit_dmg": (None, "Cdmg1"),
    "accuracy": (None, "Acc1"),
    "resist": (None, "Res1"),
}


# ----------------------------------------------------------------------
# HTTP client
# ----------------------------------------------------------------------


class Client:
    def __init__(self, delay: float = DELAY_SEC):
        self._s = requests.Session()
        self._s.headers.update({"User-Agent": UA})
        self._delay = delay
        self._last = 0.0

    def _throttle(self):
        wait = self._delay - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        self._last = time.monotonic()

    def api(self, **params) -> dict:
        self._throttle()
        params.setdefault("format", "json")
        r = self._s.get(API_URL, params=params, timeout=TIMEOUT_SEC)
        r.raise_for_status()
        return r.json()

    def download(self, url: str, dest: Path):
        self._throttle()
        r = self._s.get(url, timeout=TIMEOUT_SEC, stream=True)
        r.raise_for_status()
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as fp:
            for chunk in r.iter_content(16384):
                if chunk:
                    fp.write(chunk)


# ----------------------------------------------------------------------
# Wikitext utilities
# ----------------------------------------------------------------------


def normalize_name(s: str) -> str:
    """Chuẩn hoá tên để so khớp cross-source."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-zA-Z0-9]", "", s).lower()
    return s


def slugify(name: str) -> str:
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))
    ascii_str = re.sub(r"[^a-zA-Z0-9]+", "_", ascii_str)
    return ascii_str.strip("_").lower()


def extract_template_body(wikitext: str, template_name: str) -> Optional[str]:
    needle = "{{" + template_name
    start = wikitext.find(needle)
    if start < 0:
        return None
    depth = 0
    i = start
    n = len(wikitext)
    while i < n - 1:
        if wikitext[i] == "{" and wikitext[i + 1] == "{":
            depth += 1
            i += 2
        elif wikitext[i] == "}" and wikitext[i + 1] == "}":
            depth -= 1
            i += 2
            if depth == 0:
                return wikitext[start + len(needle):i - 2]
        else:
            i += 1
    return None


def parse_template_fields(block: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for m in re.finditer(
        r"^\|\s*(\w+)\s*=\s*(.*?)(?=^\|\s*\w+\s*=|\Z)",
        block,
        re.MULTILINE | re.DOTALL,
    ):
        fields[m.group(1)] = m.group(2).strip()
    return fields


# ----------------------------------------------------------------------
# List page parser
# ----------------------------------------------------------------------


_LIST_ROW_RE = re.compile(
    r"\|\s*(?P<no>\d+|\?)\s*\n"
    r"\|\s*\[\[File:(?P<img>[^|\]]+?)(?:\|[^\]]*)?\]\]\s*\n"
    r"\|\s*\[\[(?P<name>[^|\]]+?)\]\]"
    r"(?:<br>[^\n]*)?\n"
    r"\|\s*data-sort-value=\"(?P<rar>[A-Z]+)\"",
    re.MULTILINE,
)


@dataclass
class FandomEntry:
    no: str
    name_en: str
    rarity: str
    list_image_file: str       # File:XXX.png on list page
    detail_page: str           # Wiki page title (name_en with _ instead of space)


def parse_list_all(wikitext: str) -> list[FandomEntry]:
    entries: list[FandomEntry] = []
    for m in _LIST_ROW_RE.finditer(wikitext):
        name = m.group("name").strip()
        if not name or name.startswith("File:"):
            continue
        entries.append(FandomEntry(
            no=m.group("no"),
            name_en=name,
            rarity=m.group("rar"),
            list_image_file=m.group("img").strip(),
            detail_page=name.replace(" ", "_"),
        ))
    return entries


# ----------------------------------------------------------------------
# Detail page parser (Main subpage)
# ----------------------------------------------------------------------


@dataclass
class FandomSkill:
    image_num: str = ""   # vd "5831" → File:5831.png
    name: str = ""


@dataclass
class FandomDetail:
    skills: list[FandomSkill] = field(default_factory=list)
    stats: dict[str, tuple[str, int]] = field(default_factory=dict)
    # stats[key] = (tier_letter or "", value)


def parse_skill_tabber(wikitext: str) -> list[FandomSkill]:
    """Parse tabber chứa các `{{SkillBox ...}}` trong section Skills."""
    skills: list[FandomSkill] = []
    # Tìm mọi SkillBox
    pos = 0
    while True:
        idx = wikitext.find("{{SkillBox", pos)
        if idx < 0:
            break
        body = extract_template_body(wikitext[idx:], "SkillBox")
        if body is None:
            break
        fields = parse_template_fields(body)
        img = (fields.get("Image") or "").strip()
        # Image có thể là "5831" hoặc "5831.png"; chỉ giữ phần số + extension
        img = re.sub(r"\s.*$", "", img)  # trim after space
        name = (fields.get("Name") or "").strip()
        skills.append(FandomSkill(image_num=img, name=name))
        pos = idx + (len(body) if body else 0) + 20
    return skills


def parse_statbox(wikitext: str) -> dict[str, tuple[str, int]]:
    body = extract_template_body(wikitext, "StatBox")
    if not body:
        return {}
    fields = parse_template_fields(body)
    out: dict[str, tuple[str, int]] = {}
    for key, (gr_field, val_field) in _STATBOX_MAP.items():
        val = 0
        if val_field:
            raw = fields.get(val_field, "").strip()
            m = re.search(r"\d+", raw)
            if m:
                val = int(m.group())
        tier = ""
        if gr_field:
            tier = (fields.get(gr_field) or "").strip().upper()
            if tier not in ("D", "C", "B", "A", "S", "SS"):
                tier = ""
        out[key] = (tier, val)
    return out


# ----------------------------------------------------------------------
# Image helpers
# ----------------------------------------------------------------------


def resolve_image_url(client: Client, filename: str) -> Optional[str]:
    if not filename:
        return None
    try:
        data = client.api(
            action="query", prop="imageinfo", titles=f"File:{filename}",
            iiprop="url",
        )
        for _, page in data["query"]["pages"].items():
            ii = page.get("imageinfo")
            if ii:
                return ii[0].get("url")
    except (requests.RequestException, KeyError):
        pass
    return None


# ----------------------------------------------------------------------
# Existing data I/O
# ----------------------------------------------------------------------


@dataclass
class ExistingIndex:
    by_rarity: dict[str, list[dict]]       # rarity → list of records
    by_normalized_name: dict[str, dict]    # normalized name → record
    by_id: dict[str, dict]                 # id → record
    record_rarity: dict[int, str]          # id(record) → rarity (to track moves)


def load_existing() -> ExistingIndex:
    idx = ExistingIndex({}, {}, {}, {})
    for rarity, fname in RARITY_FILES.items():
        path = DATA_DIR / fname
        if not path.exists():
            idx.by_rarity[rarity] = []
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            data = []
        idx.by_rarity[rarity] = data
        for rec in data:
            if not isinstance(rec, dict):
                continue
            rid = rec.get("id")
            if rid:
                idx.by_id[rid] = rec
                idx.record_rarity[id(rec)] = rarity
            # Index by any name variant
            for key in ("name_vi", "name_jp", "name_en", "id"):
                val = rec.get(key, "")
                if isinstance(val, str) and val:
                    nk = normalize_name(val)
                    if nk and nk not in idx.by_normalized_name:
                        idx.by_normalized_name[nk] = rec
    return idx


def save_existing(idx: ExistingIndex):
    for rarity, records in idx.by_rarity.items():
        path = DATA_DIR / RARITY_FILES[rarity]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8"
        )


# ----------------------------------------------------------------------
# Merge logic
# ----------------------------------------------------------------------


def _is_empty_stats(stats: dict) -> bool:
    """True nếu toàn bộ stats mặc định (value 0 + tier '', trừ crit_dmg=150)."""
    for key in STAT_KEYS:
        v = stats.get(key) or {}
        value = v.get("value", 0) if isinstance(v, dict) else 0
        tier = v.get("tier", "") if isinstance(v, dict) else ""
        default_value = 150 if key == "crit_dmg" else 0
        if value != default_value or tier != "":
            return False
    return True


def enrich_record(
    rec: dict,
    fandom: FandomEntry,
    detail: Optional[FandomDetail],
    portrait_rel: Optional[str],
) -> list[str]:
    """Merge fandom data vào rec TẠI CHỖ. Trả về list các field đã thay đổi."""
    changed: list[str] = []

    # 1) name_en — fill nếu rỗng
    if not rec.get("name_en"):
        rec["name_en"] = fandom.name_en
        changed.append("name_en")

    # 2) image portrait — fill nếu hiện tại rỗng hoặc file không tồn tại
    current_img = rec.get("image", "")
    if portrait_rel:
        current_abs = PROJECT_ROOT / current_img if current_img else None
        if not current_img or (current_abs and not current_abs.exists()):
            rec["image"] = portrait_rel
            changed.append("image")

    if detail is None:
        return changed

    # 3) Skills — match theo index, chỉ fill image rỗng
    existing_skills = rec.get("skills") or []
    for i, fskill in enumerate(detail.skills):
        if i >= len(existing_skills):
            break
        s = existing_skills[i]
        if not isinstance(s, dict):
            continue
        if not s.get("image") and fskill.image_num:
            img_name = fskill.image_num
            if not img_name.endswith((".png", ".jpg", ".webp")):
                img_name += ".png"
            s["image"] = f"assets/images/skills/{img_name}"
            changed.append(f"skills[{i}].image")

    # 4) Stats — chỉ fill khi toàn bộ stats mặc định
    if detail.stats and _is_empty_stats(rec.get("stats") or {}):
        stats = rec.setdefault("stats", {})
        for key in STAT_KEYS:
            tier, value = detail.stats.get(key, ("", 0))
            stats[key] = {"value": value, "tier": tier}
        changed.append("stats")

    return changed


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--skip-images", action="store_true",
                   help="Không tải ảnh, chỉ merge metadata.")
    p.add_argument("--dry-run", action="store_true",
                   help="Preview thay đổi, không ghi file.")
    p.add_argument("--limit", type=int, default=None,
                   help="Giới hạn N shikigami đầu (debug).")
    p.add_argument("--no-create-new", action="store_true",
                   help="Không thêm record mới; ghi fandom-only vào "
                        "tools/scraper/unmapped_fandom.json để review tay.")
    p.add_argument("--delay", type=float, default=DELAY_SEC)
    return p.parse_args()


def _rel(p: Path) -> str:
    try:
        return str(p.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(p)


def main() -> int:
    args = _parse_args()
    client = Client(delay=args.delay)
    existing = load_existing()

    total_existing = sum(len(rs) for rs in existing.by_rarity.values())
    print(f"Current data: {total_existing} shikigami across {len(existing.by_rarity)} rarity files", flush=True)

    # 1) Tải rarity icons
    if not args.skip_images:
        RARITY_DIR.mkdir(parents=True, exist_ok=True)
        print("→ Tải rarity icons (5 file)…", flush=True)
        for r in RARITIES:
            dest = RARITY_DIR / f"{r.lower()}.png"
            if dest.exists():
                continue
            url = resolve_image_url(client, f"{r}.png")
            if url:
                try:
                    client.download(url, dest)
                    print(f"  ✓ {r}.png → {_rel(dest)}", flush=True)
                except Exception as exc:  # noqa: BLE001
                    print(f"  ! {r}.png: {exc}", flush=True)

    # 2) Fetch list
    print("→ Fetch Shikigami/List/All", flush=True)
    data = client.api(action="parse", page="Shikigami/List/All", prop="wikitext")
    list_wt = data["parse"]["wikitext"]["*"]
    entries = parse_list_all(list_wt)
    print(f"  Fandom list: {len(entries)} shikigami", flush=True)
    if args.limit:
        entries = entries[: args.limit]

    stats_counter = {"matched": 0, "new": 0, "changed": 0, "unchanged": 0,
                     "skipped_unmapped": 0}
    changes_per_record: dict[str, list[str]] = {}
    unmapped: list[dict] = []

    for ei, entry in enumerate(entries, 1):
        norm = normalize_name(entry.name_en)
        match = existing.by_normalized_name.get(norm)
        is_new = match is None

        # Portrait image dest
        portrait_rel = None
        if not args.skip_images and entry.list_image_file and entry.list_image_file != "?.png":
            rarity_dir = entry.rarity.lower()
            fname = entry.list_image_file
            ext = Path(fname).suffix or ".png"
            # Dùng name_en slug làm filename để dễ match code
            dest_name = f"{slugify(entry.name_en)}{ext}"
            dest = IMG_DIR / rarity_dir / dest_name
            portrait_rel = f"assets/images/shikigami/{rarity_dir}/{dest_name}"
            if not dest.exists():
                url = resolve_image_url(client, fname)
                if url:
                    try:
                        client.download(url, dest)
                    except Exception as exc:  # noqa: BLE001
                        print(f"    ! portrait {entry.name_en}: {exc}", flush=True)

        # Detail page (retry với backoff cho transient network errors)
        detail: Optional[FandomDetail] = None
        detail_wt = ""
        for attempt in range(3):
            try:
                resp = client.api(
                    action="parse", page=f"{entry.detail_page}/Main",
                    prop="wikitext",
                )
                detail_wt = resp.get("parse", {}).get("wikitext", {}).get("*", "")
                break
            except requests.HTTPError:
                break  # 404 / page không tồn tại → bỏ qua không retry
            except requests.RequestException as exc:
                if attempt == 2:
                    print(f"    ! {entry.name_en}: bỏ qua sau 3 lần retry: {exc}",
                          flush=True)
                else:
                    time.sleep(2 ** attempt * 2)
        if detail_wt:
            detail = FandomDetail(
                skills=parse_skill_tabber(detail_wt),
                stats=parse_statbox(detail_wt),
            )
            # Tải skill images
            if not args.skip_images:
                skills_img_dir = PROJECT_ROOT / "assets" / "images" / "skills"
                skills_img_dir.mkdir(parents=True, exist_ok=True)
                for fskill in detail.skills:
                    if not fskill.image_num:
                        continue
                    img_name = fskill.image_num
                    if not img_name.endswith((".png", ".jpg", ".webp")):
                        img_name += ".png"
                    dest = skills_img_dir / img_name
                    if dest.exists():
                        continue
                    url = resolve_image_url(client, img_name)
                    if not url:
                        continue
                    try:
                        client.download(url, dest)
                    except Exception:  # noqa: BLE001
                        pass

        if is_new and args.no_create_new:
            # Lưu vào unmapped để user review match thủ công sau
            unmapped.append({
                "name_en": entry.name_en,
                "rarity": entry.rarity,
                "fandom_no": entry.no,
                "detail_page": entry.detail_page,
                "portrait_image": portrait_rel or "",
                "skills": [
                    {"name": fskill.name, "image": (
                        f"assets/images/skills/{fskill.image_num}"
                        f"{'.png' if not fskill.image_num.endswith(('.png','.jpg','.webp')) else ''}"
                        if fskill.image_num else "")}
                    for fskill in (detail.skills if detail else [])
                ],
                "stats": ({k: {"value": v[1], "tier": v[0]}
                           for k, v in detail.stats.items()}
                          if detail and detail.stats else {}),
                "source_url": f"https://onmyoji.fandom.com/wiki/{entry.detail_page}",
            })
            stats_counter["skipped_unmapped"] += 1
            print(f"  [{ei:>2}/{len(entries)}] ? {entry.rarity:3s}  "
                  f"{entry.name_en}  → unmapped", flush=True)
        elif is_new:
            # Tạo record mới với minimum data
            new_rec = {
                "id": slugify(entry.name_en),
                "name_vi": "",
                "name_jp": "",
                "name_en": entry.name_en,
                "friendly_name": [],
                "rarity": entry.rarity,
                "role": [],
                "description": "",
                "obtain": [],
                "stats": {k: {"value": 150 if k == "crit_dmg" else 0, "tier": ""}
                          for k in STAT_KEYS},
                "skills": [],
                "recommended_souls": [],
                "lore": "",
                "image": portrait_rel or "",
                "source_url": f"https://onmyoji.fandom.com/wiki/{entry.detail_page}",
            }
            if detail:
                for fskill in detail.skills:
                    img_name = fskill.image_num
                    if img_name and not img_name.endswith((".png", ".jpg", ".webp")):
                        img_name += ".png"
                    new_rec["skills"].append({
                        "name": fskill.name,
                        "description": "",
                        "levels": [],
                        "image": f"assets/images/skills/{img_name}" if img_name else "",
                    })
                if detail.stats:
                    for key in STAT_KEYS:
                        tier, value = detail.stats.get(key, ("", 0))
                        new_rec["stats"][key] = {"value": value, "tier": tier}
            target_list = existing.by_rarity.setdefault(entry.rarity, [])
            target_list.append(new_rec)
            existing.by_id[new_rec["id"]] = new_rec
            existing.by_normalized_name[norm] = new_rec
            stats_counter["new"] += 1
            changes_per_record[new_rec["id"]] = ["NEW"]
            print(f"  [{ei:>2}/{len(entries)}] + NEW  {entry.rarity:3s}  "
                  f"{entry.name_en}", flush=True)
        else:
            changes = enrich_record(match, entry, detail, portrait_rel)
            stats_counter["matched"] += 1
            if changes:
                stats_counter["changed"] += 1
                changes_per_record[match.get("id", "?")] = changes
                print(f"  [{ei:>2}/{len(entries)}] ✎ {entry.rarity:3s}  "
                      f"{entry.name_en}  ← {', '.join(changes)}", flush=True)
            else:
                stats_counter["unchanged"] += 1

    # Write unmapped report
    if unmapped and not args.dry_run:
        unmapped_path = Path(__file__).parent / "unmapped_fandom.json"
        unmapped_path.write_text(
            json.dumps(unmapped, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"\n→ Unmapped fandom shikigami ({len(unmapped)}) đã ghi: "
              f"tools/scraper/unmapped_fandom.json", flush=True)

    # Write back
    if not args.dry_run:
        save_existing(existing)
        print(f"\n✓ Ghi lại {len(existing.by_rarity)} file rarity tại {_rel(DATA_DIR)}",
              flush=True)
    else:
        print("\n[DRY-RUN] Không ghi file", flush=True)

    print(f"\n=== Summary ===", flush=True)
    print(f"  Matched: {stats_counter['matched']}", flush=True)
    print(f"  Changed (enriched): {stats_counter['changed']}", flush=True)
    print(f"  Unchanged: {stats_counter['unchanged']}", flush=True)
    print(f"  New records: {stats_counter['new']}", flush=True)
    if stats_counter["skipped_unmapped"]:
        print(f"  Skipped (unmapped): {stats_counter['skipped_unmapped']}",
              flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
