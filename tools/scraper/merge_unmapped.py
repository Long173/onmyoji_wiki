#!/usr/bin/env python3
"""Merge unmapped_fandom.json vào shikigami data, có target_id user duyệt.

Workflow 2 bước:

    1. Tạo suggestion (idempotent — chỉ fill các target_id đang rỗng):

           python merge_unmapped.py

       Script đọc `unmapped_fandom.json`, tự đoán `target_id` cho mỗi entry
       dựa trên last-word match với existing records, ghi lại file.

    2. Mở `unmapped_fandom.json` review:
       - `"target_id": "ngu_soan_tan"`  → merge vào record id đó
       - `"target_id": "NEW"`           → tạo record mới (rarity từ fandom)
       - `"target_id": "SKIP"`          → bỏ qua
       - `"target_id": "?"`             → script không quyết được, BẠN sửa tay
       - rỗng                           → cũng SKIP (an toàn)

    3. Apply merge:

           python merge_unmapped.py --apply

       Merge policy: chỉ FILL field rỗng/default, KHÔNG overwrite gì user đã có.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Optional

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "assets" / "data" / "shikigami"
UNMAPPED = Path(__file__).parent / "unmapped_fandom.json"

RARITIES = ["SSR", "SR", "SP", "R", "N"]
RARITY_FILES = {r: f"{r.lower()}.json" for r in RARITIES}
STAT_KEYS = (
    "hp", "attack", "defense", "speed", "crit_rate", "crit_dmg",
    "accuracy", "resist",
)

# Awakened-form prefix tokens xuất hiện trên fandom — KHÔNG dùng để match.
# Vd "Rokumei Ootakemaru" → match phải dựa vào "Ootakemaru" chứ không phải
# "Rokumei". Danh sách dưới đây quan sát từ thực tế fandom Onmyoji.
AWAKENED_PREFIXES = {
    "matsuyoi", "rokumei", "hatsurei", "yomei", "kuusou", "kaisei", "inaba",
    "mujin", "kamiochi", "daiyamaten", "kokorogari", "shinkei", "ryuukou",
    "shura", "jinshin", "negai", "byounen", "honshin", "eikyo", "shoufuku",
    "gyoujitsu", "ryougin", "younen", "shinyuu", "shinjou", "youon", "seishi",
    "jiyou", "unjou", "myoushu", "shakubana", "shokugetsu", "tsumugi",
    # SP/SSR variants thường gặp:
    "sp", "awakened",
}


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------


def normalize(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())


def name_tokens(name: str) -> list[str]:
    """Tokenize tên thành các từ nhỏ (lowercase ASCII, bỏ dấu)."""
    s = unicodedata.normalize("NFKD", name or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-zA-Z0-9 ]+", " ", s).lower()
    return [t for t in s.split() if t]


def load_existing() -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for r, fn in RARITY_FILES.items():
        path = DATA_DIR / fn
        if path.exists():
            try:
                out[r] = json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                out[r] = []
        else:
            out[r] = []
    return out


def save_existing(data: dict[str, list[dict]]):
    for r, fn in RARITY_FILES.items():
        path = DATA_DIR / fn
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(data.get(r, []), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


def find_record(by_id: dict[str, dict], target_id: str) -> Optional[dict]:
    return by_id.get(target_id)


def all_records_index(data: dict[str, list[dict]]) -> tuple[dict[str, dict], dict[str, str]]:
    """Trả (id→rec, id→rarity)."""
    by_id: dict[str, dict] = {}
    rarity: dict[str, str] = {}
    for r, recs in data.items():
        for rec in recs:
            rid = rec.get("id")
            if rid:
                by_id[rid] = rec
                rarity[rid] = r
    return by_id, rarity


# ----------------------------------------------------------------------
# Suggestion engine
# ----------------------------------------------------------------------


def suggest_target_id(
    fandom_name: str,
    fandom_rarity: str,
    existing: dict[str, list[dict]],
) -> str:
    """Đoán target_id cho 1 fandom entry. Trả id, hoặc "NEW", hoặc "?"."""
    tokens = name_tokens(fandom_name)
    if not tokens:
        return "NEW"

    # Loại bỏ awakened prefix tokens; còn lại là tên gốc shikigami
    core = [t for t in tokens if t not in AWAKENED_PREFIXES]
    if not core:
        core = tokens  # fallback

    # Build candidate fields cho từng record
    candidates_score: dict[str, int] = {}
    for r, recs in existing.items():
        for rec in recs:
            rid = rec.get("id", "")
            haystack = " ".join([
                rec.get("name_en", ""),
                rec.get("name_jp", ""),
                rec.get("name_vi", ""),
                " ".join(rec.get("friendly_name", []) or []),
            ])
            hs_norm = normalize(haystack)
            score = 0
            for tok in core:
                if tok and tok in hs_norm:
                    score += len(tok)
            # Same-rarity bonus (SP→SP, SSR→SSR)
            if score > 0 and r == fandom_rarity:
                score += 5
            if score > 0:
                candidates_score[rid] = max(candidates_score.get(rid, 0), score)

    if not candidates_score:
        return "NEW"

    # Sort theo score giảm dần
    sorted_cands = sorted(candidates_score.items(), key=lambda x: -x[1])
    best_id, best_score = sorted_cands[0]
    if len(sorted_cands) == 1:
        return best_id
    second_score = sorted_cands[1][1]
    # Nếu best score gấp đôi second → chọn best, ngược lại → ambiguous
    if best_score >= second_score * 2:
        return best_id
    return "?"


def suggest_command(unmapped: list[dict], existing: dict[str, list[dict]]) -> int:
    counter = Counter()
    for entry in unmapped:
        # Idempotent: chỉ fill nếu target_id chưa có hoặc rỗng
        if entry.get("target_id"):
            counter[entry["target_id"] if entry["target_id"] in {"NEW","SKIP","?"} else "EXISTING"] += 1
            continue
        suggestion = suggest_target_id(entry["name_en"], entry["rarity"], existing)
        entry["target_id"] = suggestion
        counter[suggestion if suggestion in {"NEW", "?"} else "EXISTING"] += 1

    UNMAPPED.write_text(
        json.dumps(unmapped, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\n=== Suggestions ===")
    for k, v in counter.most_common():
        print(f"  {k}: {v}")
    print(f"\nĐã ghi target_id vào {UNMAPPED.relative_to(PROJECT_ROOT)}")
    print("→ Mở file review/sửa, xong chạy: python merge_unmapped.py --apply")
    return 0


# ----------------------------------------------------------------------
# Apply engine
# ----------------------------------------------------------------------


def _is_default_stats(stats: dict) -> bool:
    if not stats:
        return True
    for k in STAT_KEYS:
        v = stats.get(k) or {}
        value = v.get("value", 0) if isinstance(v, dict) else 0
        tier = v.get("tier", "") if isinstance(v, dict) else ""
        default = 150 if k == "crit_dmg" else 0
        if value != default or tier != "":
            return False
    return True


def merge_into(target: dict, fandom: dict) -> list[str]:
    """Merge fandom entry vào existing target tại chỗ. Trả list field thay đổi."""
    changed: list[str] = []

    if not target.get("name_en") and fandom.get("name_en"):
        target["name_en"] = fandom["name_en"]
        changed.append("name_en")

    fimg = fandom.get("portrait_image") or ""
    cur_img = target.get("image") or ""
    cur_abs = (PROJECT_ROOT / cur_img) if cur_img else None
    if fimg and (not cur_img or (cur_abs and not cur_abs.exists())):
        target["image"] = fimg
        changed.append("image")

    f_skills = fandom.get("skills") or []
    t_skills = target.get("skills") or []
    for i, fsk in enumerate(f_skills):
        if i >= len(t_skills):
            break
        if not isinstance(t_skills[i], dict):
            continue
        if not t_skills[i].get("image") and fsk.get("image"):
            t_skills[i]["image"] = fsk["image"]
            changed.append(f"skills[{i}].image")

    if fandom.get("stats") and _is_default_stats(target.get("stats") or {}):
        new_stats = {}
        for k in STAT_KEYS:
            v = fandom["stats"].get(k) or {}
            new_stats[k] = {
                "value": int(v.get("value", 0) or 0),
                "tier": str(v.get("tier", "") or ""),
            }
        # Đảm bảo crit_dmg có default 150 nếu fandom không cung cấp
        if not new_stats["crit_dmg"]["value"]:
            new_stats["crit_dmg"]["value"] = 150
        target["stats"] = new_stats
        changed.append("stats")

    return changed


def build_new_record(fandom: dict) -> dict:
    """Tạo record mới với toàn bộ data fandom + placeholder VN."""
    name_en = fandom.get("name_en", "")
    sid = re.sub(r"[^a-zA-Z0-9]+", "_", name_en).strip("_").lower() or "unknown"
    skills = []
    for fsk in fandom.get("skills") or []:
        skills.append({
            "name": fsk.get("name", ""),
            "description": "",
            "levels": [],
            "image": fsk.get("image", ""),
        })
    stats: dict[str, dict] = {}
    fstats = fandom.get("stats") or {}
    for k in STAT_KEYS:
        v = fstats.get(k) or {}
        default = 150 if k == "crit_dmg" else 0
        stats[k] = {
            "value": int(v.get("value", default) or default),
            "tier": str(v.get("tier", "") or ""),
        }
    return {
        "id": sid,
        "name_vi": "",
        "name_jp": "",
        "name_en": name_en,
        "friendly_name": [],
        "rarity": fandom.get("rarity", "N"),
        "role": [],
        "description": "",
        "obtain": [],
        "stats": stats,
        "skills": skills,
        "recommended_souls": [],
        "lore": "",
        "image": fandom.get("portrait_image") or "",
        "source_url": fandom.get("source_url") or "",
    }


def apply_command(unmapped: list[dict], existing: dict[str, list[dict]]) -> int:
    by_id, rec_rarity = all_records_index(existing)

    counter = Counter()
    enriched_logs: list[str] = []
    new_logs: list[str] = []
    skipped_logs: list[str] = []

    for entry in unmapped:
        target = (entry.get("target_id") or "").strip()
        name_en = entry.get("name_en", "")

        if not target or target == "SKIP":
            counter["skip"] += 1
            skipped_logs.append(name_en)
            continue
        if target == "?":
            counter["unresolved"] += 1
            print(f"  ? {name_en}: target_id = '?', cần sửa tay → bỏ qua",
                  flush=True)
            continue

        if target == "NEW":
            rec = build_new_record(entry)
            rar = rec["rarity"]
            # Idempotent: nếu id đã tồn tại thì merge vào đó thay vì tạo trùng
            if rec["id"] in by_id:
                existing_target = by_id[rec["id"]]
                changes = merge_into(existing_target, entry)
                counter["new_already_exists"] += 1
                print(f"  ↻ EXISTS {rar:3s}  {name_en} (id {rec['id']} đã có) "
                      f"({', '.join(changes) or 'no-op'})", flush=True)
                continue
            existing.setdefault(rar, []).append(rec)
            by_id[rec["id"]] = rec
            rec_rarity[rec["id"]] = rar
            counter["new"] += 1
            new_logs.append(f"{rar} {rec['id']} ({name_en})")
            print(f"  + NEW   {rar:3s}  {name_en}", flush=True)
            continue

        # Else: target is an existing id
        target_rec = by_id.get(target)
        if not target_rec:
            counter["unresolved"] += 1
            print(f"  ! {name_en}: target_id '{target}' không tồn tại → bỏ qua",
                  flush=True)
            continue
        changes = merge_into(target_rec, entry)
        counter["enriched"] += 1
        enriched_logs.append(
            f"{rec_rarity[target]} {target} ← {name_en}: {', '.join(changes) or '(no change)'}"
        )
        print(
            f"  ✎ MERGE {rec_rarity[target]:3s}  {target} ← {name_en}  "
            f"({', '.join(changes) or 'no-op'})",
            flush=True,
        )

    save_existing(existing)
    print(f"\n=== Apply summary ===")
    for k, v in counter.most_common():
        print(f"  {k}: {v}")
    return 0


# ----------------------------------------------------------------------
# CLI
# ----------------------------------------------------------------------


def main() -> int:
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--apply", action="store_true",
                   help="Áp dụng merge dựa trên target_id (mặc định: chỉ suggest).")
    args = p.parse_args()

    if not UNMAPPED.exists():
        print(f"Không tìm thấy {UNMAPPED}. Chạy enrich_shikigami_fandom.py trước.",
              file=sys.stderr)
        return 1
    unmapped = json.loads(UNMAPPED.read_text(encoding="utf-8"))
    existing = load_existing()

    if args.apply:
        return apply_command(unmapped, existing)
    return suggest_command(unmapped, existing)


if __name__ == "__main__":
    sys.exit(main())
