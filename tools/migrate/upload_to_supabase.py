#!/usr/bin/env python3
"""Upload bundled JSON + images to Supabase (Postgres + Storage).

Reads:
  assets/data/shikigami/{ssr,sr,sp,r,n}.json
  assets/data/souls.json
  assets/data/effects.json
  assets/images/**/*

Writes:
  public.shikigami / public.souls / public.effects (upsert by id)
  storage.objects in bucket "assets" (preserves the relative path layout)
  public.manifest (bumps version per collection when content hash changed)

Idempotent: re-running with no changes is a no-op (manifest version stays).
Run `python upload_to_supabase.py --help` for flags.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable

from dotenv import load_dotenv
from supabase import Client, create_client

# ──────────────────────────────────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────────────────────────────────
HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent.parent
ASSETS_DIR = PROJECT_ROOT / "assets"
DATA_DIR = ASSETS_DIR / "data"
IMAGES_DIR = ASSETS_DIR / "images"

BUCKET = "assets"
RARITIES = ("ssr", "sr", "sp", "r", "n")


# ──────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────
def normalize_image_path(p: str) -> str:
    """Convert legacy ``assets/images/foo.webp`` paths to bucket keys
    (``foo.webp``). Empty / already-bucket-key / URL inputs pass through.
    """
    if not p:
        return ""
    if p.startswith(("http://", "https://")):
        return p
    for prefix in ("assets/images/", "assets/"):
        if p.startswith(prefix):
            return p[len(prefix):]
    return p


def canonical_hash(rows: list[dict[str, Any]]) -> str:
    """sha256 of canonically-encoded JSON (sorted keys, rows sorted by id).
    Used to detect "did anything actually change?" before bumping the
    manifest version, so cold-syncs don't churn.
    """
    sorted_rows = sorted(rows, key=lambda r: r.get("id", ""))
    blob = json.dumps(sorted_rows, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def load_json_array(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    data = json.loads(text)
    if not isinstance(data, list):
        raise SystemExit(f"Expected JSON array in {path}, got {type(data).__name__}")
    return data


# ──────────────────────────────────────────────────────────────────────────
# Row builders — map JSON shape → Postgres column shape
# ──────────────────────────────────────────────────────────────────────────
def build_shikigami_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for rarity in RARITIES:
        items = load_json_array(DATA_DIR / "shikigami" / f"{rarity}.json")
        for idx, item in enumerate(items):
            # Normalize image paths in skills too.
            skills = item.get("skills") or []
            for s in skills:
                if isinstance(s, dict) and "image" in s:
                    s["image"] = normalize_image_path(s["image"])
            role = item.get("role")
            if isinstance(role, str):
                role = [role] if role else []
            elif not isinstance(role, list):
                role = []
            rows.append({
                "id": item["id"],
                "name_vi": item.get("name_vi", "") or "",
                "name_jp": item.get("name_jp", "") or "",
                "name_en": item.get("name_en", "") or "",
                "friendly_name": item.get("friendly_name") or [],
                "rarity": (item.get("rarity") or rarity).upper(),
                "role": role,
                "description": item.get("description", "") or "",
                "obtain": item.get("obtain") or [],
                "stats": item.get("stats") or {},
                "skills": skills,
                "recommended_souls": item.get("recommended_souls") or [],
                "lore": item.get("lore", "") or "",
                "image": normalize_image_path(item.get("image", "") or ""),
                "source_url": item.get("source_url", "") or "",
                "sort_index": idx,
            })
    return rows


def build_souls_rows() -> list[dict[str, Any]]:
    items = load_json_array(DATA_DIR / "souls.json")
    rows = []
    for idx, item in enumerate(items):
        kind = (item.get("kind") or "normal").lower()
        if kind not in ("normal", "boss"):
            kind = "normal"
        rows.append({
            "id": item["id"],
            "name_vi": item.get("name_vi", "") or "",
            "name_en": item.get("name_en", "") or "",
            "kind": kind,
            "effects": item.get("effects") or [],
            "image": normalize_image_path(item.get("image", "") or ""),
            "sort_index": idx,
        })
    return rows


def build_effects_rows() -> list[dict[str, Any]]:
    items = load_json_array(DATA_DIR / "effects.json")
    rows = []
    for idx, item in enumerate(items):
        kind = (item.get("kind") or "buff").lower()
        if kind not in ("buff", "debuff", "other"):
            kind = "buff"
        rows.append({
            "id": item["id"],
            "name": item.get("name", "") or "",
            "en_name": item.get("en_name", "") or "",
            "kind": kind,
            "description": item.get("description", "") or "",
            "image": normalize_image_path(item.get("image", "") or ""),
            "sort_index": idx,
        })
    return rows


# ──────────────────────────────────────────────────────────────────────────
# Upload steps
# ──────────────────────────────────────────────────────────────────────────
@dataclass
class CollectionPlan:
    name: str
    rows: list[dict[str, Any]]


def upsert_collection(client: Client, plan: CollectionPlan, batch: int = 200) -> None:
    """Upsert in batches so we don't hit request-size limits on the larger
    `shikigami` table.
    """
    total = len(plan.rows)
    for start in range(0, total, batch):
        chunk = plan.rows[start:start + batch]
        client.table(plan.name).upsert(chunk).execute()
        print(f"  · {plan.name}: upserted {min(start + batch, total)}/{total}")


def upload_images(client: Client, dry_run: bool = False) -> int:
    """Mirror assets/images/ into the bucket. Returns number of files uploaded
    (or that would be uploaded in dry-run).
    """
    if not IMAGES_DIR.exists():
        print(f"  · skip: {IMAGES_DIR} does not exist")
        return 0
    count = 0
    for path in sorted(IMAGES_DIR.rglob("*")):
        if not path.is_file():
            continue
        if path.name.startswith(".") or path.name.endswith(".gitkeep"):
            continue
        relative = path.relative_to(IMAGES_DIR).as_posix()
        count += 1
        if dry_run:
            continue
        mime, _ = mimetypes.guess_type(path.name)
        with open(path, "rb") as fh:
            client.storage.from_(BUCKET).upload(
                path=relative,
                file=fh,
                file_options={
                    # Re-uploads OK — already-uploaded files get overwritten.
                    "upsert": "true",
                    "content-type": mime or "application/octet-stream",
                    "cache-control": "public, max-age=31536000, immutable",
                },
            )
        if count % 50 == 0:
            print(f"  · uploaded {count} files…")
    print(f"  · {'would upload' if dry_run else 'uploaded'} {count} files")
    return count


def bump_manifest(
    client: Client,
    collection: str,
    rows: list[dict[str, Any]],
    *,
    dry_run: bool = False,
) -> tuple[int, bool]:
    """Compare hash; bump version only when content changed.
    Returns (new_version, changed).
    """
    new_hash = canonical_hash(rows)
    existing = (
        client.table("manifest")
        .select("version,content_hash")
        .eq("collection", collection)
        .single()
        .execute()
    )
    current_hash = (existing.data or {}).get("content_hash") or ""
    current_version = int((existing.data or {}).get("version") or 1)
    changed = current_hash != new_hash
    new_version = current_version + 1 if changed else current_version
    if not changed:
        print(f"  · {collection}: no content change (v{current_version})")
        return new_version, False
    if dry_run:
        print(f"  · {collection}: would bump v{current_version} → v{new_version}")
        return new_version, True
    client.table("manifest").update({
        "version": new_version,
        "row_count": len(rows),
        "content_hash": new_hash,
    }).eq("collection", collection).execute()
    print(f"  · {collection}: v{current_version} → v{new_version} ({len(rows)} rows)")
    return new_version, True


# ──────────────────────────────────────────────────────────────────────────
# Entry
# ──────────────────────────────────────────────────────────────────────────
def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--only",
        choices=["data", "images", "manifest", "all"],
        default="all",
        help="Limit which phase runs (default: all).",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Plan only — count rows/files, no network writes.",
    )
    return p.parse_args(argv)


def make_client() -> Client:
    load_dotenv(HERE / ".env")
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise SystemExit(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. "
            "Copy tools/migrate/.env.example → tools/migrate/.env and fill it."
        )
    return create_client(url, key)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])

    plans: list[CollectionPlan] = [
        CollectionPlan("shikigami", build_shikigami_rows()),
        CollectionPlan("souls", build_souls_rows()),
        CollectionPlan("effects", build_effects_rows()),
    ]

    print(
        "Plan:"
        f"\n  shikigami: {len(plans[0].rows)} rows"
        f"\n  souls:     {len(plans[1].rows)} rows"
        f"\n  effects:   {len(plans[2].rows)} rows"
    )

    if args.dry_run:
        print("\nDry run — skipping network writes.")
    client = make_client()

    if args.only in ("data", "all"):
        print("\n→ Upserting data...")
        for plan in plans:
            if args.dry_run:
                print(f"  · would upsert {len(plan.rows)} rows into {plan.name}")
            else:
                upsert_collection(client, plan)

    if args.only in ("images", "all"):
        print("\n→ Uploading images...")
        upload_images(client, dry_run=args.dry_run)

    if args.only in ("manifest", "all"):
        print("\n→ Bumping manifest...")
        for plan in plans:
            bump_manifest(client, plan.name, plan.rows, dry_run=args.dry_run)

    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
