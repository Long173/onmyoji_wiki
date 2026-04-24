#!/usr/bin/env python3
"""Scrape Thức Thần từ onmyojicltl.wordpress.com về JSON + tải ảnh.

Cách dùng:
    cd tools/scraper
    pip install -r requirements.txt
    python scrape_shikigami.py                    # scrape đầy đủ 4 rarity
    python scrape_shikigami.py --rarity SSR       # chỉ 1 rarity
    python scrape_shikigami.py --limit 3          # test nhanh: 3 item đầu mỗi rarity
    python scrape_shikigami.py --skip-images      # không tải ảnh
    python scrape_shikigami.py --out ../../assets/data/shikigami.json   # ghi đè

Output mặc định:
    assets/data/shikigami.scraped.json     (không đè dữ liệu curate tay)
    assets/images/shikigami/{id}.png
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Iterable, Optional
from urllib.parse import urljoin, urlparse

try:
    import requests
    from bs4 import BeautifulSoup, Tag
except ImportError:
    print(
        "Thiếu dependency. Chạy: pip install -r requirements.txt",
        file=sys.stderr,
    )
    sys.exit(1)

from text_cleaner import clean_text

BASE_URL = "https://onmyojicltl.wordpress.com"
USER_AGENT = (
    "OnmyojiWikiVN-Scraper/1.0 "
    "(+contact: long.nh@newera.inc)"
)
REQUEST_DELAY_SEC = 1.2
REQUEST_TIMEOUT_SEC = 30

RARITY_INDEX_PATHS = {
    "SSR": "/ssr/",
    "SR": "/sr/",
    "SP": "/sp/",
    # /r-n/ pha trộn R và N; ta đánh dấu "R_OR_N" rồi suy ra dựa theo tag nếu cần
    "R_OR_N": "/r-n/",
}

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT_DIR = PROJECT_ROOT / "assets" / "data" / "shikigami"
DEFAULT_IMG_DIR = PROJECT_ROOT / "assets" / "images" / "shikigami"

# Rarity -> tên file output. SP/SSR/SR/R/N mỗi loại 1 file để dễ import/edit.
OUTPUT_FILE_FOR = {
    "SSR": "ssr.json",
    "SR": "sr.json",
    "SP": "sp.json",
    "R": "r.json",
    "N": "n.json",
}

# --------------------------------------------------------------------------------------
# Models
# --------------------------------------------------------------------------------------


STAT_KEYS = (
    "hp",
    "attack",
    "defense",
    "speed",
    "crit_rate",
    "crit_dmg",
    "accuracy",
    "resist",
)


_STAT_DEFAULTS: dict[str, int] = {
    "crit_dmg": 150,  # đa số Thức Thần khởi điểm ST chí mạng = 150%
}


def _default_stats() -> dict:
    return {
        k: {"value": _STAT_DEFAULTS.get(k, 0), "tier": ""}
        for k in STAT_KEYS
    }


def _normalize_stats(raw: object) -> dict:
    """Chuyển stat về dạng chuẩn {value, tier}. Hỗ trợ legacy (int)."""
    out = _default_stats()
    if not isinstance(raw, dict):
        return out
    for k in STAT_KEYS:
        v = raw.get(k)
        if isinstance(v, (int, float)):
            out[k] = {"value": int(v), "tier": ""}
        elif isinstance(v, dict):
            out[k] = {
                "value": int(v.get("value", 0) or 0),
                "tier": str(v.get("tier", "") or "").upper(),
            }
    return out


@dataclass
class SkillLevel:
    level: int
    description: str

    def to_json(self) -> dict:
        return {"level": self.level, "description": self.description}


@dataclass
class Skill:
    name: str
    description: str  # mô tả base (giữ tương thích ngược)
    levels: list[SkillLevel] = field(default_factory=list)
    cost: Optional[int] = None
    image: str = ""

    def to_json(self) -> dict:
        d: dict = {
            "name": self.name,
            "description": self.description,
            "levels": [lv.to_json() for lv in self.levels],
            "image": self.image,
        }
        if self.cost is not None:
            d["cost"] = self.cost
        return d


@dataclass
class Shikigami:
    id: str
    name_vi: str
    name_jp: str = ""
    name_en: str = ""
    friendly_name: list[str] = field(default_factory=list)
    rarity: str = "N"
    # Một thức thần có thể đa vai trò (công + thủ...); scraper không suy được
    # nên để rỗng, user điền tay. Preserve khi re-scrape.
    role: list[str] = field(default_factory=list)
    description: str = ""
    obtain: list[str] = field(default_factory=list)
    # Mỗi stat là {value: int, tier: "D"..."SS"|""}. Scraper không extract
    # được từ trang nguồn nên để mặc định rỗng; user điền tay + preserve qua
    # re-scrape.
    stats: dict = field(default_factory=lambda: _default_stats())
    skills: list[Skill] = field(default_factory=list)
    recommended_souls: list[str] = field(default_factory=list)
    lore: str = ""
    image: str = ""
    source_url: str = ""

    def to_json(self) -> dict:
        return {
            "id": self.id,
            "name_vi": self.name_vi,
            "name_jp": self.name_jp,
            "name_en": self.name_en,
            "friendly_name": self.friendly_name,
            "rarity": self.rarity,
            "role": self.role,
            "description": self.description,
            "obtain": self.obtain,
            "stats": self.stats,
            "skills": [s.to_json() for s in self.skills],
            "recommended_souls": self.recommended_souls,
            "lore": self.lore,
            "image": self.image,
            "source_url": self.source_url,
        }


# --------------------------------------------------------------------------------------
# HTTP session
# --------------------------------------------------------------------------------------


class Client:
    def __init__(self, delay: float = REQUEST_DELAY_SEC) -> None:
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": USER_AGENT})
        self._delay = delay
        self._last_at: float = 0.0

    def _throttle(self) -> None:
        elapsed = time.monotonic() - self._last_at
        wait = self._delay - elapsed
        if wait > 0:
            time.sleep(wait)
        self._last_at = time.monotonic()

    def get_html(self, url: str) -> str:
        self._throttle()
        r = self._session.get(url, timeout=REQUEST_TIMEOUT_SEC)
        r.raise_for_status()
        return r.text

    def download(self, url: str, dest: Path) -> None:
        self._throttle()
        r = self._session.get(url, timeout=REQUEST_TIMEOUT_SEC, stream=True)
        r.raise_for_status()
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as fp:
            for chunk in r.iter_content(chunk_size=16384):
                if chunk:
                    fp.write(chunk)


# --------------------------------------------------------------------------------------
# Parsers
# --------------------------------------------------------------------------------------

_KY_NANG_PREFIX = re.compile(r"^(?:KỸ\s*NĂNG|Kỹ\s*năng)\s+", re.IGNORECASE)
_DETAIL_URL_PATTERN = re.compile(
    r"^https?://onmyojicltl\.wordpress\.com/\d{4}/\d{2}/\d{2}/ky-nang-[^/]+/?$"
)
_NAME_WITH_JP = re.compile(r"^(?P<vi>.+?)\s*\((?P<jp>[^)]+)\)\s*$")


def slug_to_id(slug: str) -> str:
    """'ky-nang-himiko' -> 'himiko'; giữ an toàn cho filename/JSON key."""
    base = slug.strip("/").split("/")[-1]
    base = re.sub(r"^ky[-_]nang[-_]", "", base)
    return base.replace("-", "_")


def strip_ky_nang(text: str) -> str:
    return _KY_NANG_PREFIX.sub("", text).strip()


def parse_index_page(html: str) -> list[tuple[str, str, str]]:
    """Lấy list (url, name_vi, name_jp) từ trang /ssr/ ... /r-n/."""
    soup = BeautifulSoup(html, "html.parser")
    results: list[tuple[str, str, str]] = []
    seen: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not _DETAIL_URL_PATTERN.match(href):
            continue
        if href in seen:
            continue
        seen.add(href)
        text = a.get_text(" ", strip=True)
        name_vi, name_jp = text, ""
        m = _NAME_WITH_JP.match(text)
        if m:
            name_vi = m.group("vi").strip()
            name_jp = m.group("jp").strip()
        results.append((href, name_vi, name_jp))
    return results


def _first_image(soup: BeautifulSoup) -> Optional[str]:
    """Ưu tiên data-orig-file để lấy ảnh độ phân giải gốc."""
    fig = soup.find("figure", class_=re.compile(r"wp-block-image"))
    if not fig:
        return None
    img = fig.find("img")
    if not img:
        return None
    return img.get("data-orig-file") or img.get("src")


def _extract_title(soup: BeautifulSoup) -> str:
    for selector in [
        ("h1", {"class": re.compile(r"entry-title|wp-block-heading")}),
        ("h2", {"class": re.compile(r"wp-block-heading|entry-title")}),
        ("h1", None),
        ("h2", None),
    ]:
        tag_name, attrs = selector
        node = soup.find(tag_name, attrs=attrs or {})
        if node and node.get_text(strip=True):
            return strip_ky_nang(node.get_text(" ", strip=True))
    return ""


_SKILL_HEADER = re.compile(
    r"^Kỹ\s*năng\s*(?:thứ\s*)?(?P<idx>[IVX]+|\d+)\s*[::]?\s*(?P<kind>.*)$",
    re.IGNORECASE,
)
_SKILL_BODY = re.compile(
    r"【\s*(?P<name>[^】]+?)\s*】\s*"
    r"(?:\(\s*(?P<cost_raw>[^)]*?)\s*\))?\s*"
    r"[::]?\s*(?P<desc>.*)$",
    re.DOTALL,
)
_LEVEL_SCALING = re.compile(r"^Lv\s*(?P<lv>[2-5])\s*[::]\s*(?P<body>.+)$", re.IGNORECASE)
_COST_NUMBER = re.compile(r"\d+")


def _paragraphs_of_entry(soup: BeautifulSoup) -> Iterable[Tag]:
    content = soup.find("div", class_="entry-content")
    if not content:
        return []
    return [p for p in content.find_all(["p"]) if p.get_text(strip=True)]


_FLUFF_PATTERNS = [
    re.compile(r"^\s*\*{2,}\s*$"),
    re.compile(r"^\s*Bản dịch chỉ mang tính tham khảo.*$", re.IGNORECASE),
    re.compile(r"^\s*Link gốc.*$", re.IGNORECASE),
    re.compile(r"^\s*Nguồn\s*:.*$", re.IGNORECASE),
    re.compile(r"^\s*Lưu ý\s*:.*$", re.IGNORECASE),
]


def _is_fluff(text: str) -> bool:
    return any(p.match(text) for p in _FLUFF_PATTERNS)


def _strip_trailing_fluff(text: str) -> str:
    """Bỏ đuôi rác thường bám sau mô tả kỹ năng."""
    cleaned = text
    for p in _FLUFF_PATTERNS:
        cleaned = p.sub("", cleaned).strip()
    cleaned = re.sub(r"\s+\*{2,}\s*$", "", cleaned).strip()
    return cleaned


def parse_skills(soup: BeautifulSoup) -> list[Skill]:
    """Parse khối kỹ năng trong entry-content.

    Mẫu:
        <p>Kỹ năng I: Đánh thường</p>
        <p>【TÊN KỸ NĂNG】(2🔥): mô tả Lv1 ...</p>
        <p>Lv2: ...</p>
        <p>Lv3: ...</p>
        (khối trống)
        <p>Kỹ năng II: Chủ động</p>
        ...
    """
    skills: list[Skill] = []
    current: Optional[dict] = None

    def flush() -> None:
        nonlocal current
        if current and current.get("name"):
            base_desc = clean_text(
                _strip_trailing_fluff(current["description"])
            )
            levels: list[SkillLevel] = []
            if base_desc:
                levels.append(SkillLevel(level=1, description=base_desc))
            for lv_n, body in current["scaling"]:
                body_clean = clean_text(_strip_trailing_fluff(body))
                if body_clean:
                    levels.append(SkillLevel(level=lv_n, description=body_clean))
            skills.append(
                Skill(
                    name=clean_text(current["name"]),
                    description=base_desc,
                    levels=levels,
                    cost=current["cost"],
                )
            )
        current = None

    for p in _paragraphs_of_entry(soup):
        text = p.get_text(" ", strip=True)
        if not text or _is_fluff(text):
            continue

        if _SKILL_HEADER.match(text):
            flush()
            current = {
                "name": "",
                "cost": None,
                "description": "",
                "scaling": [],  # list[tuple[int, str]]
            }
            continue

        m_body = _SKILL_BODY.match(text)
        if m_body and current is not None and not current["name"]:
            current["name"] = m_body.group("name").strip()
            cost_raw = m_body.group("cost_raw") or ""
            mnum = _COST_NUMBER.search(cost_raw)
            if mnum:
                current["cost"] = int(mnum.group(0))
            current["description"] = m_body.group("desc").strip()
            continue

        m_lv = _LEVEL_SCALING.match(text)
        if m_lv and current is not None and current["name"]:
            current["scaling"].append(
                (int(m_lv.group("lv")), m_lv.group("body").strip())
            )
            continue

        # Body nhiều dòng: ghép vào mô tả Lv1 khi đang mở skill và chưa có Lv2+
        if current is not None and current["name"] and not current["scaling"]:
            current["description"] = (
                current["description"] + " " + text.strip()
            ).strip()

    flush()
    return skills


def _tags_of_post(soup: BeautifulSoup) -> set[str]:
    tags: set[str] = set()
    for a in soup.find_all("a", rel=True):
        rel = a.get("rel") or []
        if isinstance(rel, list) and "tag" in rel:
            tags.add(a.get_text(strip=True).lower())
    # Dự phòng: tag trong href /tag/xxx/
    for a in soup.find_all("a", href=True):
        m = re.search(r"/tag/([^/]+)/?$", a["href"])
        if m:
            tags.add(m.group(1).lower())
    return tags


_RARITY_TAGS = {"ssr", "sr", "sp", "r", "n"}


def resolve_rarity(tags: set[str], fallback: str) -> str:
    for t in tags:
        if t in _RARITY_TAGS:
            return t.upper()
    return fallback if fallback != "R_OR_N" else "R"


# --------------------------------------------------------------------------------------
# Orchestrator
# --------------------------------------------------------------------------------------


def _image_extension(url: str) -> str:
    path = urlparse(url).path
    ext = Path(path).suffix.lower()
    return ext if ext in {".png", ".jpg", ".jpeg", ".webp", ".gif"} else ".png"


def _safe_filename(name: str) -> str:
    # Dùng lại slug ASCII — ở đây name đã là ASCII dạng slug (từ URL)
    return re.sub(r"[^a-zA-Z0-9_\-]", "_", name)


def scrape(
    client: Client,
    rarity_label: str,
    index_path: str,
    limit: Optional[int],
    image_dir: Path,
    skip_images: bool,
) -> list[Shikigami]:
    index_url = urljoin(BASE_URL, index_path)
    print(f"→ Index [{rarity_label}] {index_url}", flush=True)

    try:
        html = client.get_html(index_url)
    except requests.HTTPError as e:
        print(f"  ✗ không tải được index: {e}", flush=True)
        return []

    entries = parse_index_page(html)
    if limit:
        entries = entries[:limit]
    print(f"  Tìm thấy {len(entries)} link chi tiết.", flush=True)

    results: list[Shikigami] = []
    for url, name_vi_idx, name_jp_idx in entries:
        try:
            item = _scrape_detail(
                client,
                url,
                name_vi_idx,
                name_jp_idx,
                rarity_fallback=rarity_label,
                image_dir=image_dir,
                skip_images=skip_images,
            )
        except Exception as exc:  # noqa: BLE001 — log and continue
            print(f"  ✗ lỗi {url}: {exc}", flush=True)
            continue
        results.append(item)
        print(
            f"  ✓ {item.rarity:<3} {item.id:<24} {item.name_vi} "
            f"({len(item.skills)} kỹ năng)",
            flush=True,
        )
    return results


def _scrape_detail(
    client: Client,
    url: str,
    name_vi_from_index: str,
    name_jp_from_index: str,
    rarity_fallback: str,
    image_dir: Path,
    skip_images: bool,
) -> Shikigami:
    html = client.get_html(url)
    soup = BeautifulSoup(html, "html.parser")

    slug = urlparse(url).path.strip("/").split("/")[-1]
    sid = slug_to_id(slug)

    title = _extract_title(soup)
    # Ưu tiên tên trong index (chứa cả Vietnamese + Japanese)
    name_vi = name_vi_from_index or title
    name_jp = name_jp_from_index

    # Phải resolve rarity trước để biết thư mục con lưu ảnh.
    rarity = resolve_rarity(_tags_of_post(soup), rarity_fallback)
    rarity_dir = rarity.lower()

    img_url = _first_image(soup)
    rel_image_path = ""
    if img_url and not skip_images:
        ext = _image_extension(img_url)
        dest = image_dir / rarity_dir / f"{_safe_filename(sid)}{ext}"
        if not dest.exists():
            try:
                client.download(img_url, dest)
            except Exception as exc:  # noqa: BLE001
                print(f"    ! không tải được ảnh: {exc}", flush=True)
        rel_image_path = f"assets/images/shikigami/{rarity_dir}/{dest.name}"
    elif img_url:
        ext = _image_extension(img_url)
        rel_image_path = (
            f"assets/images/shikigami/{rarity_dir}/{_safe_filename(sid)}{ext}"
        )
    skills = parse_skills(soup)

    return Shikigami(
        id=sid,
        name_vi=name_vi,
        name_jp=name_jp,
        rarity=rarity,
        skills=skills,
        image=rel_image_path,
        source_url=url,
    )


# --------------------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------------------


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument(
        "--rarity",
        choices=list(RARITY_INDEX_PATHS.keys()) + ["ALL"],
        default="ALL",
        help="Chỉ scrape 1 rarity (mặc định: ALL).",
    )
    p.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Chỉ scrape N item đầu mỗi rarity (để test nhanh).",
    )
    p.add_argument(
        "--out-dir",
        type=Path,
        default=DEFAULT_OUT_DIR,
        help=(
            "Thư mục output — mỗi rarity 1 file {ssr,sr,sp,r,n}.json "
            f"(mặc định: {DEFAULT_OUT_DIR.relative_to(PROJECT_ROOT)})."
        ),
    )
    p.add_argument(
        "--image-dir",
        type=Path,
        default=DEFAULT_IMG_DIR,
        help=f"Thư mục lưu ảnh (mặc định: {DEFAULT_IMG_DIR.relative_to(PROJECT_ROOT)}).",
    )
    p.add_argument("--skip-images", action="store_true", help="Bỏ qua tải ảnh.")
    p.add_argument(
        "--delay",
        type=float,
        default=REQUEST_DELAY_SEC,
        help="Khoảng nghỉ giữa 2 request (giây).",
    )
    return p.parse_args()


def _load_user_curated(out_dir: Path) -> dict[str, dict]:
    """Đọc các file per-rarity cũ (nếu có) để giữ lại trường user điền tay.

    Preserve: `friendly_name`, `role`, `stats` (nếu đã điền), `skill_images`.
    """
    out: dict[str, dict] = {}
    if not out_dir.exists():
        return out
    for fname in OUTPUT_FILE_FOR.values():
        path = out_dir / fname
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if not isinstance(data, list):
            continue
        _extract_curated(data, out)
    return out


def _extract_curated(data: list, out: dict[str, dict]) -> None:
    for rec in data:
        if not isinstance(rec, dict):
            continue
        sid = rec.get("id")
        if not isinstance(sid, str):
            continue
        entry: dict = {}
        fn = rec.get("friendly_name")
        if isinstance(fn, list):
            entry["friendly_name"] = [str(x) for x in fn]
        role = rec.get("role")
        if isinstance(role, list):
            entry["role"] = [str(x) for x in role if x]
        elif isinstance(role, str) and role:
            entry["role"] = [role]
        stats = rec.get("stats")
        if isinstance(stats, dict):
            # Chỉ preserve nếu user đã chỉnh stat khỏi default (có tier, hoặc
            # value khác với giá trị mặc định của scraper).
            normalized = _normalize_stats(stats)
            default = _default_stats()
            has_data = any(
                normalized[k]["value"] != default[k]["value"]
                or normalized[k]["tier"] != ""
                for k in STAT_KEYS
            )
            if has_data:
                entry["stats"] = normalized
        skills = rec.get("skills")
        if isinstance(skills, list):
            entry["skill_images"] = [
                (s.get("image") or "") if isinstance(s, dict) else ""
                for s in skills
            ]
        if entry:
            out[sid] = entry


def main() -> int:
    args = _parse_args()
    client = Client(delay=args.delay)

    targets = (
        list(RARITY_INDEX_PATHS.items())
        if args.rarity == "ALL"
        else [(args.rarity, RARITY_INDEX_PATHS[args.rarity])]
    )

    all_items: list[Shikigami] = []
    for rarity_label, path in targets:
        all_items.extend(
            scrape(
                client=client,
                rarity_label=rarity_label,
                index_path=path,
                limit=args.limit,
                image_dir=args.image_dir,
                skip_images=args.skip_images,
            )
        )

    # Khử trùng lặp theo id, GIỮ NGUYÊN thứ tự xuất hiện từ trang index
    # (tức là theo ngày đăng — bài mới nhất nằm đầu, giống thứ tự trên web).
    # dict Python 3.7+ preserve insertion order nên chỉ cần ghi nhận lần đầu.
    seen: dict[str, Shikigami] = {}
    for it in all_items:
        if it.id not in seen:
            seen[it.id] = it
    merged = list(seen.values())

    # Preserve các trường user điền tay (biệt danh, role, stats, lore...) từ
    # file output cũ nếu có. Scraper không tự override những gì user đã sửa.
    preserved = _load_user_curated(args.out_dir)
    for item in merged:
        extras = preserved.get(item.id)
        if not extras:
            continue
        if extras.get("friendly_name"):
            item.friendly_name = list(extras["friendly_name"])
        if extras.get("role"):
            item.role = list(extras["role"])
        if extras.get("stats"):
            item.stats = _normalize_stats(extras["stats"])
        skill_images: list[str] = extras.get("skill_images", [])
        for i, img in enumerate(skill_images):
            if i < len(item.skills) and img:
                item.skills[i].image = img

    # Partition theo rarity và ghi ra file riêng. Chỉ đụng vào rarity đã scrape
    # lần này — rarity không scrape vẫn giữ file cũ.
    args.out_dir.mkdir(parents=True, exist_ok=True)
    scraped_rarities = {r for r, _ in targets}
    # Map R_OR_N → cả R + N được phân loại theo tag detail page
    touched_files = set()
    by_rarity: dict[str, list[Shikigami]] = {r: [] for r in OUTPUT_FILE_FOR}
    for item in merged:
        by_rarity.setdefault(item.rarity, []).append(item)

    def _rel(p: Path) -> str:
        try:
            return str(p.relative_to(PROJECT_ROOT))
        except ValueError:
            return str(p)

    for rarity, fname in OUTPUT_FILE_FOR.items():
        # Chỉ ghi các rarity đã được scrape lần này (hoặc có thể suy ra được).
        was_scraped = rarity in scraped_rarities or (
            rarity in {"R", "N"} and "R_OR_N" in scraped_rarities
        )
        if not was_scraped:
            continue
        items = by_rarity.get(rarity, [])
        path = args.out_dir / fname
        path.write_text(
            json.dumps(
                [it.to_json() for it in items], ensure_ascii=False, indent=2
            ),
            encoding="utf-8",
        )
        touched_files.add(fname)
        print(f"✓ {fname}: {len(items)} record → {_rel(path)}", flush=True)

    if not args.skip_images:
        print(f"  Ảnh lưu tại {_rel(args.image_dir)}/", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
