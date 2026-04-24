#!/usr/bin/env python3
"""Scrape Soul (Ngự hồn) từ Onmyoji Fandom wiki (MediaWiki API).

Cách dùng:
    cd tools/scraper
    source .venv/bin/activate
    python scrape_souls.py                   # full scrape + tải ảnh
    python scrape_souls.py --skip-images     # không tải ảnh
    python scrape_souls.py --limit 5         # test nhanh

Output mặc định:
    assets/data/souls.json        (overwrite, giữ lại name_vi + recommended_for
                                   bằng cách match theo en_name)
    assets/images/souls/{id}.png
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
    print("Thiếu dependency. Chạy: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)

API_URL = "https://onmyoji.fandom.com/api.php"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
)
DELAY_SEC = 1.0
TIMEOUT_SEC = 30

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = PROJECT_ROOT / "assets" / "data" / "souls.json"
DEFAULT_IMG_DIR = PROJECT_ROOT / "assets" / "images" / "souls"


# ----------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------


@dataclass
class SoulRecord:
    id: str
    name_en: str
    name_vi: str
    kind: str  # "normal" | "boss"
    effects: list[dict] = field(default_factory=list)
    image: str = ""
    # Meta — không ghi vào JSON chính nhưng lưu để dùng nội bộ:
    _image_file: str = ""

    def to_json(self) -> dict:
        return {
            "id": self.id,
            "name_vi": self.name_vi,
            "name_en": self.name_en,
            "kind": self.kind,
            "effects": self.effects,
            "image": self.image,
        }


# ----------------------------------------------------------------------
# HTTP
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

    def download(self, url: str, dest: Path) -> None:
        self._throttle()
        r = self._s.get(url, timeout=TIMEOUT_SEC, stream=True)
        r.raise_for_status()
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as fp:
            for chunk in r.iter_content(16384):
                if chunk:
                    fp.write(chunk)


# ----------------------------------------------------------------------
# Wikitext parsers
# ----------------------------------------------------------------------


def slugify(name: str) -> str:
    """'Jizo Statue' -> 'jizo_statue'. ASCII an toàn để làm id/filename."""
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))
    ascii_str = re.sub(r"[^a-zA-Z0-9]+", "_", ascii_str)
    return ascii_str.strip("_").lower()


def parse_template_fields(block: str) -> dict[str, str]:
    """Parse MediaWiki template body (phần giữa `{{...}}`).

    Trả dict {key: value}. Giá trị giữ nguyên wikitext, sẽ post-clean sau.
    """
    fields: dict[str, str] = {}
    # Matches lines starting with | key = ... until next | key = ... or end
    for m in re.finditer(
        r"^\|\s*(\w+)\s*=\s*(.*?)(?=^\|\s*\w+\s*=|\Z)",
        block,
        re.MULTILINE | re.DOTALL,
    ):
        fields[m.group(1)] = m.group(2).strip()
    return fields


def extract_template_body(wikitext: str, template_name: str) -> Optional[str]:
    """Lấy phần giữa `{{TemplateName ... }}`, tôn trọng braces lồng."""
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
                body = wikitext[start + len(needle):i - 2]
                return body
        else:
            i += 1
    return None


_WIKI_LINK_RE = re.compile(r"\[\[(?:[^|\]]+\|)?([^\]]+)\]\]")
_FILE_IMG_RE = re.compile(r"\[\[File:[^|\]]+(?:\|[^\]]*)?\]\]")
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_TEMPLATE_RE = re.compile(r"\{\{[^}]*\}\}")


def clean_wikitext(raw: str) -> str:
    """Làm sạch wikitext → plain text tiếng Anh có thể đọc được."""
    if not raw:
        return ""
    text = raw
    # Xoá [[File:...|...]] images
    text = _FILE_IMG_RE.sub("", text)
    # [[Link|Display]] → Display; [[Link]] → Link
    text = _WIKI_LINK_RE.sub(lambda m: m.group(1), text)
    # Xoá inline templates {{Item|...|...}}
    text = _TEMPLATE_RE.sub("", text)
    # Xoá tag HTML
    text = _HTML_TAG_RE.sub(" ", text)
    # Bullet list * X\n* Y → X. Y.
    text = re.sub(r"^\s*\*\s*", " ", text, flags=re.MULTILINE)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ----------------------------------------------------------------------
# Scrapers
# ----------------------------------------------------------------------


def fetch_wikitext(client: Client, page: str) -> str:
    data = client.api(action="parse", page=page, prop="wikitext")
    try:
        return data["parse"]["wikitext"]["*"]
    except KeyError:
        return ""


def parse_released_list(wikitext: str) -> list[str]:
    """Trích list tên tiếng Anh các soul thường từ table."""
    names: list[str] = []
    seen: set[str] = set()
    # Lấy [[Name]] ở cột Name (bỏ link tới File: và internal fragments)
    for m in re.finditer(r"\[\[([^|\]#]+?)\]\]", wikitext):
        n = m.group(1).strip()
        # Bỏ File:, Template:, các link phụ
        if ":" in n:
            continue
        if n in seen:
            continue
        # Skip kiểu "Demon Parade", "Summon" (không phải tên soul)
        # Cách lọc: soul thật sự xuất hiện ngay sau [[File:SoulN.png|...]]
        seen.add(n)
        names.append(n)
    # Unused prefix filter: giữ tất cả, post-filter sau khi fetch từng page
    return names


def parse_boss_souls(wikitext: str) -> list[dict]:
    """Trích danh sách boss souls từ page Boss_Souls.

    Mỗi boss soul ở trong 1 `{{MitamaBox/Boss ... }}` block.
    """
    results: list[dict] = []
    pos = 0
    while True:
        idx = wikitext.find("{{MitamaBox/Boss", pos)
        if idx < 0:
            break
        body = extract_template_body(wikitext[idx:], "MitamaBox/Boss")
        if body is None:
            break
        fields = parse_template_fields(body)
        if fields.get("name_en"):
            results.append(fields)
        # Advance past this block
        pos = idx + (len(body) if body else 0) + 20
    return results


def parse_normal_soul_fields(wikitext: str) -> Optional[dict]:
    body = extract_template_body(wikitext, "MitamaBox")
    if body is None:
        return None
    fields = parse_template_fields(body)
    if not fields.get("name_en") and not fields.get("combo2"):
        return None
    return fields


# ----------------------------------------------------------------------
# Images
# ----------------------------------------------------------------------


_BOSS_IMAGE_OVERRIDES: dict[str, str] = {
    # Tên EN → File: trên wiki (dùng khi lookup mặc định không ra)
    "Odokuro": "Gashadokuro.png",
    "Namazu": "Jishin Namazu.png",
    "Ghostly Songstress": "Ghostly Songstress1.png",
    "Nightly Aramitama": "Aramitama.png",
}


def _boss_image_alternatives(name_en: str) -> list[str]:
    """Các biến thể tên file ảnh thường gặp cho boss soul."""
    base = name_en.replace(" ", "_")
    override = _BOSS_IMAGE_OVERRIDES.get(name_en)
    alternatives = [
        f"{base}.jpg",
        f"{base}.webp",
        f"{base}_(Soul).png",
        f"Soul_{base}.png",
        f"{base}_Mitama.png",
    ]
    if override:
        alternatives.insert(0, override)
    return alternatives


def image_url(client: Client, filename: str) -> Optional[str]:
    if not filename:
        return None
    data = client.api(
        action="query", prop="imageinfo", titles=f"File:{filename}",
        iiprop="url",
    )
    try:
        pages = data["query"]["pages"]
        for _, page in pages.items():
            ii = page.get("imageinfo")
            if ii:
                return ii[0].get("url")
    except KeyError:
        pass
    return None


def image_filename_from_row(wikitext: str, name_en: str) -> Optional[str]:
    """Tìm `File:SoulN.png` đi kèm với tên soul trong danh sách Released."""
    # Row pattern: [[File:Soul1.png|60px|link=Snow Spirit]]\n| [[Snow Spirit]]
    pattern = re.compile(
        r"\[\[File:([^|\]]+\.(?:png|jpg|jpeg|webp|gif))[^\]]*\][^\[]*\[\["
        + re.escape(name_en) + r"\]\]",
        re.IGNORECASE | re.DOTALL,
    )
    m = pattern.search(wikitext)
    if m:
        return m.group(1)
    return None


# ----------------------------------------------------------------------
# Preserve user-curated data
# ----------------------------------------------------------------------


def load_existing(path: Path) -> dict[str, dict]:
    """Return dict keyed by lowercase english name (derived from existing data)."""
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    if not isinstance(data, list):
        return {}
    # Index by id (and also by lowercased name_vi as fallback)
    out: dict[str, dict] = {}
    for rec in data:
        if not isinstance(rec, dict):
            continue
        sid = rec.get("id")
        if sid:
            out[sid] = rec
        name_vi = rec.get("name_vi", "")
        if name_vi:
            out[name_vi.lower()] = rec
    return out


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", type=Path, default=DEFAULT_OUT,
                   help="File JSON đầu ra.")
    p.add_argument("--image-dir", type=Path, default=DEFAULT_IMG_DIR,
                   help="Thư mục lưu ảnh.")
    p.add_argument("--skip-images", action="store_true",
                   help="Không tải ảnh (nhanh).")
    p.add_argument("--limit", type=int, default=None,
                   help="Chỉ scrape N soul đầu (cho test).")
    p.add_argument("--delay", type=float, default=DELAY_SEC,
                   help="Khoảng nghỉ giữa 2 request (giây).")
    return p.parse_args()


def _rel(p: Path) -> str:
    try:
        return str(p.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(p)


def main() -> int:
    args = _parse_args()
    client = Client(delay=args.delay)

    existing = load_existing(args.out)

    # 1) Danh sách soul thường (released)
    print("→ Fetch Soul/List/Released", flush=True)
    released_wt = fetch_wikitext(client, "Soul/List/Released")
    normal_names = parse_released_list(released_wt)
    # Lọc bớt tên không phải soul (link phụ): giữ tên xuất hiện gần [[File:SoulN.png]]
    soul_rows: list[tuple[str, Optional[str]]] = []
    for name in normal_names:
        img = image_filename_from_row(released_wt, name)
        if img:
            soul_rows.append((name, img))
    print(f"  Soul thường: {len(soul_rows)}", flush=True)
    if args.limit:
        soul_rows = soul_rows[: args.limit]

    # 2) Boss souls
    print("→ Fetch Boss_Souls", flush=True)
    boss_wt = fetch_wikitext(client, "Boss_Souls")
    boss_raw = parse_boss_souls(boss_wt)
    print(f"  Boss souls: {len(boss_raw)}", flush=True)
    if args.limit:
        boss_raw = boss_raw[: args.limit]

    records: list[SoulRecord] = []

    # Boss souls: wikitext Boss_Souls đã chứa đủ info (name_en, type, combo2).
    # Ảnh boss soul trên fandom theo pattern `File:{Name}.png` (vd File:Tsuchigumo.png).
    for fields in boss_raw:
        name_en = clean_wikitext(fields.get("name_en", "")).strip()
        if not name_en:
            continue
        sid = slugify(name_en)
        existing_rec = existing.get(sid) or existing.get(name_en.lower()) or {}
        effects = []
        e1 = clean_wikitext(fields.get("type", ""))
        e2 = clean_wikitext(fields.get("combo2", ""))
        if e1:
            effects.append({"pieces": 1, "description": e1})
        if e2:
            effects.append({"pieces": 2, "description": e2})
        rec = SoulRecord(
            id=sid,
            name_en=name_en,
            # Scraper ghi name_en từ wiki; name_vi để rỗng cho user điền tay.
            # Preserve name_vi cũ CHỈ khi nó khác name_en (tức user đã sửa tay),
            # tránh mang theo các bản auto-copy từ lần scrape cũ.
            name_vi=(
                existing_rec.get("name_vi")
                if existing_rec.get("name_vi")
                and existing_rec.get("name_vi") != name_en
                else ""
            ),
            kind="boss",
            effects=effects,
            _image_file=f"{name_en.replace(' ', '_')}.png",
        )
        records.append(rec)

    # Soul thường: fetch từng page
    for idx, (name_en, img_file) in enumerate(soul_rows, 1):
        try:
            wt = fetch_wikitext(client, name_en.replace(" ", "_"))
        except requests.HTTPError as exc:
            print(f"  ✗ {name_en}: {exc}", flush=True)
            continue
        fields = parse_normal_soul_fields(wt)
        if not fields:
            print(f"  ! {name_en}: không có MitamaBox", flush=True)
            continue
        sid = slugify(name_en)
        existing_rec = existing.get(sid) or existing.get(name_en.lower()) or {}
        effects = []
        c2 = clean_wikitext(fields.get("combo2", ""))
        c4 = clean_wikitext(fields.get("combo4", ""))
        if c2:
            effects.append({"pieces": 2, "description": c2})
        if c4:
            effects.append({"pieces": 4, "description": c4})
        rec = SoulRecord(
            id=sid,
            name_en=name_en,
            # Scraper ghi name_en từ wiki; name_vi để rỗng cho user điền tay.
            # Preserve name_vi cũ CHỈ khi nó khác name_en (tức user đã sửa tay),
            # tránh mang theo các bản auto-copy từ lần scrape cũ.
            name_vi=(
                existing_rec.get("name_vi")
                if existing_rec.get("name_vi")
                and existing_rec.get("name_vi") != name_en
                else ""
            ),
            kind="normal",
            effects=effects,
            _image_file=img_file or "",
        )
        records.append(rec)
        print(f"  [{idx:>2}/{len(soul_rows)}] ✓ {name_en}  ({sid})", flush=True)

    # 3) Tải ảnh (optional)
    if not args.skip_images:
        args.image_dir.mkdir(parents=True, exist_ok=True)
        for rec in records:
            fname = rec._image_file
            if not fname:
                continue
            ext = Path(fname).suffix or ".png"
            dest = args.image_dir / f"{rec.id}{ext}"
            rec.image = f"assets/images/souls/{dest.name}"
            if dest.exists():
                continue
            url = image_url(client, fname)
            if not url and rec.kind == "boss":
                # Thử các biến thể tên khác cho boss soul
                for alt in _boss_image_alternatives(rec.name_en):
                    url = image_url(client, alt)
                    if url:
                        fname = alt
                        ext = Path(fname).suffix or ".png"
                        dest = args.image_dir / f"{rec.id}{ext}"
                        rec.image = f"assets/images/souls/{dest.name}"
                        break
            if not url:
                print(f"  ! {rec.id}: không resolve được URL {fname}", flush=True)
                continue
            try:
                client.download(url, dest)
            except Exception as exc:  # noqa: BLE001
                print(f"  ! {rec.id}: lỗi tải ảnh: {exc}", flush=True)
    else:
        # Dù không tải, vẫn điền path image để JSON nhất quán
        for rec in records:
            if rec._image_file:
                ext = Path(rec._image_file).suffix or ".png"
                rec.image = f"assets/images/souls/{rec.id}{ext}"

    # 4) Ghi JSON
    args.out.parent.mkdir(parents=True, exist_ok=True)
    payload = [r.to_json() for r in records]
    args.out.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    normal_ct = sum(1 for r in records if r.kind == "normal")
    boss_ct = sum(1 for r in records if r.kind == "boss")
    print(f"\n✓ Lưu {len(records)} soul ({normal_ct} thường + {boss_ct} boss) "
          f"→ {_rel(args.out)}", flush=True)
    if not args.skip_images:
        print(f"  Ảnh: {_rel(args.image_dir)}/", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
