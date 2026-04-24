# Scraper — onmyojicltl.wordpress.com

Script Python kéo dữ liệu Thức Thần (tên VI + JP, ảnh, kỹ năng, rarity) từ blog
dịch `onmyojicltl.wordpress.com`. Output theo **per-rarity JSON** — mỗi rarity 1
file, dễ import/sửa.

## Cài đặt

```bash
cd tools/scraper
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Chạy

```bash
# Scrape đầy đủ 4 rarity (SSR, SR, SP, R/N), tải ảnh:
python scrape_shikigami.py

# Chỉ scrape 1 rarity (SAFE — chỉ ghi file rarity đó, các file khác giữ nguyên):
python scrape_shikigami.py --rarity SSR

# Test nhanh 3 item đầu mỗi tier, không tải ảnh:
python scrape_shikigami.py --limit 3 --skip-images

# Xuất sang thư mục khác để tránh đè dữ liệu chính:
python scrape_shikigami.py --out-dir /tmp/scraper-test
```

## Output

Thư mục mặc định `assets/data/shikigami/`:

```
assets/data/shikigami/
├── ssr.json      # ~43 record
├── sr.json       # ~7 record
├── sp.json       # ~47 record
├── r.json        # ~2 record
└── n.json        # [] rỗng (chưa có bản dịch N)
```

Ảnh tại `assets/images/shikigami/{id}.png`.

## Preserve — không mất data điền tay

Khi re-scrape, scraper đọc các file output cũ và **giữ lại** các trường user điền tay:

- `friendly_name` (biệt danh VN)
- `role` (công/thủ/hỗ trợ/khống chế — có thể multi)
- `stats` (nếu đã chỉnh khỏi default)
- `skills[i].image` (đường dẫn ảnh kỹ năng)

Scraper chỉ ghi đè các file **rarity đã scrape lần đó**. Ví dụ chạy `--rarity SSR`
chỉ sửa `ssr.json`, các file khác nguyên vẹn.

## Giới hạn

Trang nguồn chỉ cung cấp **tên + ảnh + kỹ năng**. Scraper **không** lấy được:

- Chỉ số cơ bản (HP/ATK/DEF/SPD/chí mạng/chính xác/kháng + tier D-SS)
- Role (công/thủ/hỗ trợ/khống chế)
- Lore/truyện, Ngự hồn đề xuất

Những trường đó scraper để mặc định (rỗng/0/150 cho crit_dmg) — bạn bổ sung tay.

## Test

```bash
python -m unittest test_preserve test_text_cleaner
```

- `test_text_cleaner`: fix dính chữ ("sốsát" → "số sát"), camelCase, dấu câu
- `test_preserve`: đảm bảo role/friendly_name/stats/skill_images không bị mất khi re-scrape

## Đạo đức scrape

- Respect robots.txt: script không chạm `/wp-admin/` v.v., chỉ public content.
- Rate limit mặc định **1.2s/request** (có thể nâng bằng `--delay 2`).
- User-Agent khai báo rõ đây là scraper phi thương mại.
- Nên ghi credit nguồn `onmyojicltl.wordpress.com` trong màn **Khác** của app.
