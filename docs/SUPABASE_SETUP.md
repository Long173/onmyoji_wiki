# Supabase Setup

Hướng dẫn 1 lần để chuyển dự án từ bundled assets → Supabase-backed (Storage + Postgres).

## 1. Tạo Supabase project

1. Lên https://supabase.com → **New project**.
2. Tham số đề xuất:
   - **Region**: `Southeast Asia (Singapore)` — latency thấp nhất cho user VN.
   - **Database password**: lưu trong password manager (chỉ dùng cho psql/CLI, app không cần).
3. Đợi ~1 phút để project provision xong.

## 2. Lấy keys

**Settings → API**, copy 3 giá trị:

| Key                             | Dùng ở đâu                           | Bảo mật                                                    |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `Project URL`                 | `.env` của Flutter app                | Public OK                                                    |
| `anon` `public` key         | `.env` của Flutter app                | Public OK (RLS bảo vệ)                                     |
| `service_role` `secret` key | `tools/migrate/.env` (Python uploader) | **TUYỆT ĐỐI KHÔNG** commit, không nhúng vào app |

## 3. Chạy migrations (schema + RLS + Storage)

Chọn 1 trong 2 cách:

### Cách A — Supabase Dashboard (đơn giản, 1 lần)

1. **SQL Editor → New query**.
2. Mở từng file trong `supabase/migrations/` theo thứ tự, paste, **Run**:
   - `0001_init.sql` — tables + indexes + triggers
   - `0002_rls.sql` — Row Level Security (public read)
   - `0003_storage.sql` — bucket `assets` + policies

### Cách B — Supabase CLI (linh hoạt, reproducible)

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>   # tìm trong URL dashboard
supabase db push                                 # apply mọi file trong supabase/migrations/
```

## 4. Verify

Trong **Table Editor**: phải thấy 4 table `shikigami`, `souls`, `effects`, `manifest` (manifest đã có 3 row seed).

Trong **Storage**: phải thấy bucket `assets` (Public).

## 5. Cấu hình Flutter

Copy file env:

```bash
cp .env.example .env
```

Sửa `.env`:

```
SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
```

`.env` đã được gitignore — không commit.

## 6. Upload data + ảnh lên Supabase

Lần đầu chạy migration:

```bash
cd tools/migrate
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Tạo .env riêng cho uploader (service_role key)
cp .env.example .env
# Sửa SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY trong tools/migrate/.env

# Dry run trước — chỉ in ra số record/file sẽ upload, không gọi network:
python upload_to_supabase.py --dry-run

# Chạy thật:
python upload_to_supabase.py

# Hoặc chỉ upload 1 phần:
python upload_to_supabase.py --only data      # chỉ JSON, không ảnh
python upload_to_supabase.py --only images    # chỉ ảnh
python upload_to_supabase.py --only manifest  # chỉ bump version manifest
```

Script idempotent — chạy nhiều lần OK, chỉ overwrite những gì đã đổi.

## 7. Chạy app

```bash
flutter pub get
flutter run
```

Lần đầu khởi động: app vào màn **Đang đồng bộ dữ liệu...** (fetch manifest + 3 collections + ảnh khi cần). Lần sau: đọc cache local, chỉ gọi network nếu manifest version đổi.

## 8. Sau khi verify app chạy OK trên server data

Bundled assets có thể remove khỏi repo (commit riêng):

```bash
git rm -r assets/data assets/images
# Giữ lại assets/fonts/ — font vẫn bundle
```

Sửa `pubspec.yaml` xóa tất cả entry trong `flutter.assets` (chỉ giữ `fonts:`).

## Troubleshooting

| Triệu chứng                        | Nguyên nhân thường gặp                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 401 Unauthorized khi fetch           | Sai anon key trong `.env`, hoặc forgot `flutter run` lại sau khi sửa `.env`                                                  |
| 404 trên ảnh                       | Bucket chưa public, hoặc file chưa upload — check Storage trong dashboard                                                         |
| Sync screen treo mãi                | Network/Supabase issue — pull-to-retry trong app, hoặc check logs Supabase dashboard → Logs → API                                 |
| Test fail `MissingPluginException` | `flutter_dotenv` cần asset entry trong `pubspec.yaml`. Đã có sẵn nếu file `.env` được include trong `flutter.assets` |

## Cost estimate

Free tier Supabase: **500MB DB + 1GB Storage + 5GB bandwidth/tháng**. Project hiện tại:

- DB: ~273 row × vài KB = <1MB
- Storage: ~8MB ảnh (557 file webp + vài png)
- Bandwidth: 5GB ≈ ~600 cold-install users/tháng (mỗi user ~8MB lần đầu)

Khi vượt → upgrade Pro ($25/tháng) **hoặc** đặt Cloudflare miễn phí proxy trước Supabase Storage để cache cạnh.
