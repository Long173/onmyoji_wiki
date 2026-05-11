-- Row Level Security: public read-only access for the wiki content.
-- Write access is reserved for the service_role key (used by the Python
-- uploader in tools/migrate/upload_to_supabase.py).
--
-- Anon key in the Flutter app should ONLY be able to SELECT.

alter table public.shikigami enable row level security;
alter table public.souls     enable row level security;
alter table public.effects   enable row level security;
alter table public.manifest  enable row level security;

-- Drop & recreate so the file is idempotent.
drop policy if exists "public read shikigami" on public.shikigami;
drop policy if exists "public read souls"     on public.souls;
drop policy if exists "public read effects"   on public.effects;
drop policy if exists "public read manifest"  on public.manifest;

create policy "public read shikigami" on public.shikigami
  for select to anon, authenticated using (true);

create policy "public read souls" on public.souls
  for select to anon, authenticated using (true);

create policy "public read effects" on public.effects
  for select to anon, authenticated using (true);

create policy "public read manifest" on public.manifest
  for select to anon, authenticated using (true);

-- No insert/update/delete policies for anon/authenticated: writes go through
-- the service_role key which bypasses RLS by design.
