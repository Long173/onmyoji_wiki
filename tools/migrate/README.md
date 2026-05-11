# Supabase Migration Uploader

Một lần (hoặc mỗi khi data đổi): đẩy bundled `assets/data/*.json` + `assets/images/**` lên Supabase Postgres + Storage.

## Setup

```bash
cd tools/migrate
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Sửa SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY trong .env
```

`SUPABASE_SERVICE_ROLE_KEY` lấy ở **Settings → API → service_role secret** trong dashboard. **Không** commit `.env` (đã có trong `.gitignore`).

## Chạy

```bash
# Xem plan, không gọi network:
python upload_to_supabase.py --dry-run

# Đẩy tất cả (data + ảnh + bump manifest):
python upload_to_supabase.py

# Chỉ một phase:
python upload_to_supabase.py --only data       # upsert 3 tables
python upload_to_supabase.py --only images     # upload toàn bộ assets/images/
python upload_to_supabase.py --only manifest   # bump version (nếu hash đổi)
```

## Idempotency

- **Data**: `upsert by id` — chạy lại OK, chỉ overwrite những record đã đổi.
- **Images**: Storage upload với `upsert: true` — overwrite file cũ.
- **Manifest**: bump version **chỉ khi** sha256 của canonical-encoded JSON đổi. Re-run với content y hệt = no-op.

## Sau khi đẩy xong

App Flutter lần khởi động kế tiếp:
1. Fetch `manifest` (3 row).
2. So sánh `version` với cache local.
3. Re-fetch các collection có version mới, ghi vào `<applicationSupport>/data_cache/*.json`.

Test bằng cách: xoá data của app (Settings → Apps → Onmyoji Wiki → Clear data), khởi động lại — phải vào sync screen và pull data từ Supabase.

## Sau khi verify

Xoá bundled assets khỏi repo (xem `docs/SUPABASE_SETUP.md` mục 8).
