#!/usr/bin/env python3
"""Scrape Skill Effects từ Onmyoji Fandom wiki.

Parse 3 section:
1. Common Terminology (table trên cùng) → kind: other
2. Buffs (trong tabber) → kind: buff
3. Debuffs (trong tabber) → kind: debuff

Cách dùng:
    cd tools/scraper
    source .venv/bin/activate
    python scrape_effects.py                  # full + tải ảnh
    python scrape_effects.py --skip-images

Output:
    assets/data/effects.json       (overwrite; preserve `name` tiếng Việt)
    assets/images/effects/{id}.png
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
DEFAULT_OUT = PROJECT_ROOT / "assets" / "data" / "effects.json"
DEFAULT_IMG_DIR = PROJECT_ROOT / "assets" / "images" / "effects"


# ----------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------


@dataclass
class EffectRecord:
    id: str
    name_en: str
    name: str       # VN — user điền tay, có thể rỗng
    kind: str       # buff | debuff | other
    description: str
    image: str = ""
    _image_file: str = ""

    def to_json(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "en_name": self.name_en,
            "description": self.description,
            "image": self.image,
            "kind": self.kind,
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


def slugify(name: str) -> str:
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))
    ascii_str = re.sub(r"[^a-zA-Z0-9]+", "_", ascii_str)
    return ascii_str.strip("_").lower()


_FILE_RE = re.compile(r"\[\[File:([^|\]]+?)(?:\|[^\]]*)?\]\]")
_LINK_RE = re.compile(r"\[\[(?:[^|\]]+\|)?([^\]]+)\]\]")
_TEMPLATE_RE = re.compile(r"\{\{[^{}]*\}\}", re.DOTALL)
_HTML_TAG_RE = re.compile(r"<[^>]+>")


def clean_text(raw: str) -> str:
    if not raw:
        return ""
    text = raw
    # Bỏ ảnh inline
    text = _FILE_RE.sub("", text)
    # [[Link|Display]] → Display, [[Link]] → Link
    text = _LINK_RE.sub(lambda m: m.group(1), text)
    # Template {{Popup|...}} — xử lý thô: lấy text="..." nếu có, else bỏ
    def _pop(m: re.Match) -> str:
        inner = m.group(0)
        t = re.search(r"text\s*=\s*([^|}]+)", inner)
        return clean_text(t.group(1)) if t else ""
    text = re.sub(r"\{\{Popup[^}]*\}\}", _pop, text)
    # Bỏ các template còn lại
    text = _TEMPLATE_RE.sub("", text)
    # Bỏ tag HTML (giữ content)
    text = _HTML_TAG_RE.sub(" ", text)
    # Bỏ bold/italic marker
    text = re.sub(r"'{2,}", "", text)
    # Gộp whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_section(wikitext: str, header: str) -> str:
    """Lấy phần text giữa `== header ==` và header == kế hoặc hết bài."""
    m = re.search(rf"^={{2,}}\s*{re.escape(header)}\s*={{2,}}", wikitext, re.MULTILINE)
    if not m:
        return ""
    start = m.end()
    # Tìm header cấp bất kỳ kế tiếp
    nxt = re.search(r"^={2,}\s*\S.*?={2,}\s*$", wikitext[start:], re.MULTILINE)
    end = start + (nxt.start() if nxt else len(wikitext) - start)
    return wikitext[start:end]


def extract_tabber_section(wikitext: str, label: str) -> str:
    """Lấy nội dung giữa `|-| {label}=` và `|-| kế` hoặc `</tabber>`."""
    m = re.search(rf"\|-\|\s*{re.escape(label)}\s*=", wikitext)
    if not m:
        return ""
    start = m.end()
    nxt = re.search(r"\|-\|[^=]+=|</tabber>", wikitext[start:])
    end = start + (nxt.start() if nxt else len(wikitext) - start)
    return wikitext[start:end]


def parse_effect_table(table_text: str) -> list[dict]:
    """Parse 1 bảng wiki gồm nhiều effect (term + description).

    Row separator: `\\n|-\\n`. Cell tiếp theo: `|\\n` hoặc `| ` bắt đầu.
    Format từng row:
        [[File:Icon.png]]
        '''Term'''<br>JP/CN
        |Description text...
    """
    results: list[dict] = []
    # Skip phần header bảng đến row đầu tiên
    body = re.split(r"^\{\|.*?$", table_text, maxsplit=1, flags=re.MULTILINE | re.DOTALL)
    body = body[-1] if len(body) > 1 else table_text
    rows = re.split(r"\n\|-\s*\n", body)
    for row in rows:
        row = row.strip()
        if not row or row.startswith("!") or row.startswith("|}"):
            continue
        # Skip header rows (chứa `!`)
        if re.match(r"^!", row):
            continue
        # Tách 2 cell: cell 1 + cell 2 (mỗi cell bắt đầu bằng ^\| )
        # Một row có thể là:
        #   | [[File:...]] \n '''Name''' \n | description
        # Hoặc bắt đầu bằng `[[File:...]]` không có `|` đầu (bị stripped).
        # Split theo `\n|` ở đầu dòng:
        cells = re.split(r"\n\|\s*", "\n" + row.strip())
        # cells[0] rỗng (do prepend \n|), cells[1] = cell1, cells[2] = cell2, ...
        cells = [c for c in cells if c is not None]
        # Keep cells with content
        cells = [c for c in cells if c.strip()]
        if len(cells) < 2:
            continue
        cell1 = cells[0]
        cell2 = "\n|".join(cells[1:])  # merge phần còn lại thành description

        # Trong cell1: tìm File: + term
        m_file = _FILE_RE.search(cell1)
        icon = m_file.group(1) if m_file else ""
        # Term name in '''...''' đầu tiên
        m_term = re.search(r"'''([^']+)'''", cell1)
        if not m_term:
            continue
        name_en = clean_text(m_term.group(1)).strip()
        if not name_en:
            continue
        description = clean_text(cell2).strip()
        results.append({
            "name_en": name_en,
            "description": description,
            "icon": icon,
        })
    return results


# ----------------------------------------------------------------------
# Image resolution
# ----------------------------------------------------------------------


def image_url(client: Client, filename: str) -> Optional[str]:
    if not filename:
        return None
    data = client.api(
        action="query", prop="imageinfo", titles=f"File:{filename}",
        iiprop="url",
    )
    try:
        for _, page in data["query"]["pages"].items():
            ii = page.get("imageinfo")
            if ii:
                return ii[0].get("url")
    except KeyError:
        pass
    return None


# ----------------------------------------------------------------------
# Preserve
# ----------------------------------------------------------------------


def load_existing(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    if not isinstance(data, list):
        return {}
    out: dict[str, dict] = {}
    for rec in data:
        if isinstance(rec, dict) and rec.get("id"):
            out[rec["id"]] = rec
    return out


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    p.add_argument("--image-dir", type=Path, default=DEFAULT_IMG_DIR)
    p.add_argument("--skip-images", action="store_true")
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
    existing = load_existing(args.out)

    print("→ Fetch Skill_Effects", flush=True)
    data = client.api(action="parse", page="Skill_Effects", prop="wikitext")
    wt = data["parse"]["wikitext"]["*"]

    # 1) Common Terminology (trong section Properties → Common Terminology)
    common_section = extract_section(wt, "Common Terminology")
    common = parse_effect_table(common_section)
    print(f"  Common Terminology: {len(common)}", flush=True)

    # 2) Buffs / Debuffs / Control Effects ở trong tabber (section Common Effects)
    common_effects = extract_section(wt, "Common Effects")
    buff_text = extract_tabber_section(common_effects, "Buffs")
    buffs = parse_effect_table(buff_text)
    print(f"  Buffs: {len(buffs)}", flush=True)
    debuff_text = extract_tabber_section(common_effects, "Debuffs")
    debuffs = parse_effect_table(debuff_text)
    # Control Effects & Similar Effects cũng thuộc debuff
    ctrl_text = extract_tabber_section(
        common_effects, "Control Effects & Similar Effects"
    )
    controls = parse_effect_table(ctrl_text)
    print(f"  Debuffs: {len(debuffs)}  Control Effects: {len(controls)}", flush=True)
    debuffs = debuffs + controls

    # 3) Build records
    records: list[EffectRecord] = []
    seen_ids: set[str] = set()
    def _add(items: list[dict], kind: str):
        for item in items:
            name_en = item["name_en"]
            sid = slugify(name_en)
            if not sid or sid in seen_ids:
                continue
            seen_ids.add(sid)
            old = existing.get(sid, {})
            records.append(EffectRecord(
                id=sid,
                name_en=name_en,
                # Preserve VN name chỉ khi user đã sửa thật (khác name_en)
                name=(
                    old.get("name") if old.get("name") and old.get("name") != name_en
                    else ""
                ),
                kind=kind,
                description=item["description"],
                _image_file=item.get("icon") or "",
            ))

    _add(common, "other")
    _add(buffs, "buff")
    _add(debuffs, "debuff")

    # Preserve các entry user tự thêm (id không có trong wiki scrape).
    for sid, rec in existing.items():
        if sid in seen_ids:
            continue
        records.append(EffectRecord(
            id=sid,
            name_en=rec.get("en_name") or "",
            name=rec.get("name") or "",
            kind=rec.get("kind") or "other",
            description=rec.get("description") or "",
            image=rec.get("image") or "",
            _image_file="",
        ))
        seen_ids.add(sid)

    # 4) Download images
    if not args.skip_images:
        args.image_dir.mkdir(parents=True, exist_ok=True)
        for rec in records:
            fname = rec._image_file
            if not fname:
                continue
            ext = Path(fname).suffix or ".png"
            dest = args.image_dir / f"{rec.id}{ext}"
            rec.image = f"assets/images/effects/{dest.name}"
            if dest.exists():
                continue
            url = image_url(client, fname)
            if not url:
                print(f"  ! {rec.id}: không resolve {fname}", flush=True)
                continue
            try:
                client.download(url, dest)
            except Exception as exc:  # noqa: BLE001
                print(f"  ! {rec.id}: lỗi tải {exc}", flush=True)
    else:
        for rec in records:
            if rec._image_file:
                ext = Path(rec._image_file).suffix or ".png"
                rec.image = f"assets/images/effects/{rec.id}{ext}"

    # 5) Write JSON
    args.out.parent.mkdir(parents=True, exist_ok=True)
    payload = [r.to_json() for r in records]
    args.out.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    by_kind = {"buff": 0, "debuff": 0, "other": 0}
    for r in records:
        by_kind[r.kind] = by_kind.get(r.kind, 0) + 1
    print(f"\n✓ Lưu {len(records)} effect "
          f"({by_kind['buff']} buff + {by_kind['debuff']} debuff + {by_kind['other']} other) "
          f"→ {_rel(args.out)}", flush=True)
    if not args.skip_images:
        print(f"  Icon: {_rel(args.image_dir)}/", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
