#!/usr/bin/env python3
"""Convert ảnh PNG/JPG sang WebP + resize → giảm size APK đáng kể.

Cách dùng (từ project root):
    tools/scraper/.venv/bin/python tools/optimize_images.py --dry-run   # preview
    tools/scraper/.venv/bin/python tools/optimize_images.py             # apply

Chính sách AN TOÀN:
- Chỉ giữ WebP nếu nhỏ hơn ít nhất 10% so với original (else keep PNG)
- Chỉ cập nhật JSON path khi WebP file thực sự tồn tại
- Tạo backup `assets/images.png.bak/` trước khi xoá nếu --backup
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Thiếu Pillow. Chạy: tools/scraper/.venv/bin/pip install Pillow",
          file=sys.stderr)
    sys.exit(1)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
IMG_ROOT = PROJECT_ROOT / "assets" / "images"
DATA_FILES = [
    PROJECT_ROOT / "assets" / "data" / "souls.json",
    PROJECT_ROOT / "assets" / "data" / "effects.json",
    *(PROJECT_ROOT / "assets" / "data" / "shikigami").glob("*.json"),
]

MAX_DIM = 600
QUALITY = 85
MIN_SAVING_RATIO = 0.10   # WebP phải nhỏ hơn ít nhất 10% mới giữ
SKIP_SUFFIXES = {".webp", ".gif"}


def convert_file(src: Path, dry_run: bool) -> tuple[int, int, bool]:
    """Trả (size_before, size_after, did_convert)."""
    size_before = src.stat().st_size
    dst = src.with_suffix(".webp")

    if dry_run:
        # Heuristic: ảnh > 50KB sẽ giảm mạnh khi qua WebP+resize, ảnh nhỏ thì không
        if size_before < 50_000:
            return size_before, size_before, False
        # Ảnh lớn (1080p) ~ 1/15 sau resize+webp
        return size_before, max(size_before // 15, 5_000), True

    try:
        img = Image.open(src)
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if "A" in img.mode else "RGB")
        w, h = img.size
        if max(w, h) > MAX_DIM:
            scale = MAX_DIM / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        img.save(dst, "WEBP", quality=QUALITY, method=6)
    except Exception as exc:  # noqa: BLE001
        print(f"  ! {src.name}: {exc}", file=sys.stderr)
        return size_before, size_before, False

    size_after = dst.stat().st_size
    # Giữ WebP chỉ khi nhỏ hơn original ≥ MIN_SAVING_RATIO
    if size_after < size_before * (1 - MIN_SAVING_RATIO):
        src.unlink()
        return size_before, size_after, True
    else:
        dst.unlink()
        return size_before, size_before, False


def update_json_paths(dry_run: bool) -> int:
    """Đổi path .png/.jpg → .webp khi WebP file thực sự tồn tại."""
    changed = 0

    def fix(obj):
        nonlocal changed
        if isinstance(obj, dict):
            for k, v in list(obj.items()):
                if isinstance(v, str) and v.startswith("assets/images/") \
                        and v.endswith((".png", ".jpg", ".jpeg")):
                    abs_png = PROJECT_ROOT / v
                    abs_webp = abs_png.with_suffix(".webp")
                    if abs_webp.exists() and not abs_png.exists():
                        obj[k] = str(Path(v).with_suffix(".webp"))
                        changed += 1
                else:
                    fix(v)
        elif isinstance(obj, list):
            for item in obj:
                fix(item)

    for path in DATA_FILES:
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        before = json.dumps(data)
        fix(data)
        if json.dumps(data) != before and not dry_run:
            path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
    return changed


def main() -> int:
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--dry-run", action="store_true", help="Preview, không sửa")
    p.add_argument("--backup", action="store_true",
                   help="Backup assets/images/ → assets/images.bak/ trước khi convert")
    args = p.parse_args()

    if not IMG_ROOT.exists():
        print(f"Không tìm thấy {IMG_ROOT}", file=sys.stderr)
        return 1

    files: list[Path] = []
    for ext in ("*.png", "*.jpg", "*.jpeg", "*.PNG", "*.JPG"):
        files.extend(IMG_ROOT.rglob(ext))
    files = [f for f in files if f.suffix.lower() not in SKIP_SUFFIXES]

    print(f"Sẽ xét {len(files)} file (max {MAX_DIM}px, quality {QUALITY}, "
          f"giữ WebP nếu giảm ≥{int(MIN_SAVING_RATIO*100)}%)", flush=True)
    if args.dry_run:
        print("[DRY-RUN] không sửa file thật\n", flush=True)
    else:
        if args.backup:
            backup = IMG_ROOT.with_suffix(".bak")
            if backup.exists():
                print(f"Backup đã tồn tại: {backup} — bỏ qua bước backup")
            else:
                print(f"Backup → {backup}", flush=True)
                shutil.copytree(IMG_ROOT, backup)

    total_before = total_after = converted = 0
    by_dir: dict[str, list[int]] = {}

    for i, src in enumerate(files, 1):
        rel_dir = str(src.relative_to(IMG_ROOT).parent)
        before, after, did = convert_file(src, args.dry_run)
        total_before += before
        total_after += after
        if did:
            converted += 1
        d = by_dir.setdefault(rel_dir, [0, 0, 0])
        d[0] += before
        d[1] += after
        if did:
            d[2] += 1
        if i % 100 == 0:
            print(f"  [{i}/{len(files)}] processed", flush=True)

    print(f"\nĐã xử lý {len(files)} file, convert {converted}, giữ nguyên "
          f"{len(files) - converted}.\n", flush=True)
    print(f"{'Directory':<25} {'Before':>10} {'After':>10} {'Saved':>10} {'Conv':>6}")
    print("-" * 70)
    for d in sorted(by_dir):
        b, a, c = by_dir[d]
        savings = (1 - a / b) * 100 if b > 0 else 0
        print(f"{d:<25} {_fmt(b):>10} {_fmt(a):>10} {savings:>8.1f}% {c:>6}")
    print("-" * 70)
    savings = (1 - total_after / total_before) * 100 if total_before > 0 else 0
    print(f"{'TOTAL':<25} {_fmt(total_before):>10} "
          f"{_fmt(total_after):>10} {savings:>8.1f}% {converted:>6}")

    if not args.dry_run:
        n = update_json_paths(False)
        print(f"\nCập nhật {n} path trong JSON từ .png → .webp")
    return 0


def _fmt(b: int) -> str:
    if b > 1024 * 1024:
        return f"{b / 1024 / 1024:.1f}MB"
    if b > 1024:
        return f"{b / 1024:.0f}KB"
    return f"{b}B"


if __name__ == "__main__":
    sys.exit(main())
