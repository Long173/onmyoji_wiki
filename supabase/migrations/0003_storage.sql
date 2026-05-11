-- Storage buckets + policies for image assets.
--
-- Single public bucket "assets" holds all image categories under prefixes
-- that mirror the current asset_paths.dart layout:
--   shikigami/{ssr,sr,sp,r,n}/<id>.webp
--   souls/<id>.webp
--   effects/<id>.webp
--   skills/<n>.webp
--   rarity/<r>.webp
--
-- The bucket is `public = true` so the Flutter app can use the
-- standard CDN URL (https://<project>.supabase.co/storage/v1/object/public/assets/...)
-- without authenticated requests.

insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do update set public = excluded.public;

-- Reads: anyone (the bucket is public, but explicit policy makes it
-- survive future changes to bucket-level defaults).
drop policy if exists "Public read assets" on storage.objects;
create policy "Public read assets"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'assets');

-- Writes: service_role only. The Python uploader sets the service_role key
-- and bypasses RLS, so we intentionally don't add INSERT/UPDATE/DELETE
-- policies for anon/authenticated.
