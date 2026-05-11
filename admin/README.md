# Onmyoji Wiki Admin Portal

Next.js admin app to edit Supabase data (Postgres + Storage) without touching JSON files / running the Python uploader.

**Scope (MVP):** full editor for the `shikigami` table — text fields, friendly names, obtain list, recommended souls, **8-stat editor with tier**, **skills with 5 levels**, **image upload to Storage**. Souls + Effects pages are placeholders for now; same pattern will be duplicated once shikigami is verified.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind v4 (no shadcn — minimal custom CSS)
- `@supabase/ssr` for cookie-based auth, `@supabase/supabase-js` for queries
- React Hook Form + Zod for forms
- Server Actions for writes
- Magic-link auth gated by an email allowlist

## Setup (local)

```bash
cd admin
cp .env.example .env.local
# Fill in:
#   NEXT_PUBLIC_SUPABASE_URL          ← same as Flutter app's .env
#   NEXT_PUBLIC_SUPABASE_ANON_KEY     ← same as Flutter app's .env
#   SUPABASE_SERVICE_ROLE_KEY         ← same as tools/migrate/.env
#   ADMIN_EMAIL_ALLOWLIST=long.nh@newera.inc,another@example.com

npm install
npm run dev
# → http://localhost:3000
```

1. Mở `http://localhost:3000` → bị redirect đến `/login`.
2. Nhập email trong allowlist → bấm **Gửi magic link**.
3. Mở inbox, click link → callback exchange code → vào dashboard.

> ⚠️ Magic link mặc định gửi từ Supabase mailbox. Trong **Supabase Dashboard → Authentication → URL Configuration**, set:
> - Site URL: `http://localhost:3000` (local) hoặc URL Vercel khi deploy
> - Redirect URLs: thêm cả `http://localhost:3000/auth/callback` và URL Vercel tương ứng

## Deploy lên Vercel

1. Push code lên GitHub (commit cả thư mục `admin/`).
2. Vercel → **New project** → import repo.
3. **Root directory**: `admin` (quan trọng — chứ không phải repo root).
4. Framework: Next.js (auto-detect).
5. Environment variables: paste 4 biến từ `.env.local`.
6. Deploy → URL kiểu `onmyoji-admin.vercel.app`.
7. Quay lại Supabase Dashboard → Authentication → URL Configuration, thêm:
   - Site URL: `https://onmyoji-admin.vercel.app`
   - Redirect URLs: `https://onmyoji-admin.vercel.app/auth/callback`

## Cách hoạt động

- **Reads**: server components dùng `service_role` client cho tốc độ (RLS không cản trên server). Pagination 50/trang, search VN diacritic-insensitive (`name_vi_unaccent ilike`).
- **Writes**: Server Action `saveShikigami()` validate qua Zod rồi `upsert()` qua service_role. `revalidatePath()` invalidate cache list + detail.
- **Image upload**: `POST /api/upload` multipart → auth check qua cookie → service_role upload vào `assets/<kind>/<rarity?>/<id>.<ext>` → return path. Client setValue thẳng vào form state.
- **Auth gate**: `src/middleware.ts` check session cookie + email allowlist trên **mọi** route trừ `/login` và `/auth/*`.

## Cấu trúc

```
src/
├── middleware.ts                       # auth gate
├── lib/
│   ├── auth.ts                         # allowlist parsing
│   ├── types.ts                        # DB row types
│   ├── schemas.ts                      # Zod forms
│   └── supabase/{client,server,admin}.ts
├── app/
│   ├── layout.tsx, globals.css
│   ├── login/page.tsx
│   ├── auth/callback/route.ts
│   ├── api/upload/route.ts             # multipart upload to Storage
│   └── (admin)/
│       ├── layout.tsx, page.tsx        # dashboard
│       ├── shikigami/
│       │   ├── page.tsx                # list
│       │   ├── [id]/page.tsx           # edit (also handles /new)
│       │   ├── [id]/actions.ts         # save/delete Server Actions
│       │   └── new/page.tsx            # re-exports [id]/page
│       ├── souls/page.tsx              # placeholder
│       └── effects/page.tsx            # placeholder
└── components/
    ├── shikigami-form.tsx              # main RHF form
    ├── skills-editor.tsx               # nested FieldArray (5 levels each)
    ├── stats-editor.tsx                # 8 stats × tier dropdown
    ├── image-upload-field.tsx          # preview + POST /api/upload
    ├── string-array-field.tsx          # chip list editor
    └── sign-out-button.tsx
```

## Mở rộng cho Souls / Effects

Mỗi table cần (~200 LOC mỗi cái):
1. `lib/schemas.ts` → thêm Zod cho row shape
2. `app/(admin)/souls/page.tsx` → list (clone shikigami)
3. `app/(admin)/souls/[id]/{page,actions}.tsx` → edit + Server Action
4. `app/(admin)/souls/new/page.tsx` → re-export
5. `components/soul-form.tsx` — text fields + effects FieldArray (`{pieces, description}`)

Image upload field tái sử dụng được — chỉ đổi `kind="souls"` / `kind="effects"`.

Khi verify shikigami flow OK → ping mình duplicate cho souls + effects.
