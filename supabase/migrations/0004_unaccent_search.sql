-- Diacritic-insensitive substring search for VN/EN/JP names.
--
-- Postgres' `unaccent(text)` is marked STABLE (it loads the dictionary at
-- runtime). Generated columns and trigram indexes both require IMMUTABLE
-- expressions, so we wrap it in a thin SQL function that asserts IMMUTABLE.
-- This is the standard Supabase pattern.

create or replace function public.f_unaccent(text)
returns text
language sql
immutable
strict
parallel safe
as $$
  select public.unaccent('public.unaccent', $1);
$$;

-- ─── shikigami ───────────────────────────────────────────────
alter table public.shikigami
  add column if not exists name_vi_unaccent text
    generated always as (lower(public.f_unaccent(coalesce(name_vi, '')))) stored,
  add column if not exists name_en_unaccent text
    generated always as (lower(public.f_unaccent(coalesce(name_en, '')))) stored,
  add column if not exists name_jp_unaccent text
    generated always as (lower(public.f_unaccent(coalesce(name_jp, '')))) stored;

create index if not exists shikigami_name_vi_unaccent_trgm
  on public.shikigami using gin (name_vi_unaccent gin_trgm_ops);
create index if not exists shikigami_name_en_unaccent_trgm
  on public.shikigami using gin (name_en_unaccent gin_trgm_ops);

-- ─── souls ───────────────────────────────────────────────────
alter table public.souls
  add column if not exists name_vi_unaccent text
    generated always as (lower(public.f_unaccent(coalesce(name_vi, '')))) stored,
  add column if not exists name_en_unaccent text
    generated always as (lower(public.f_unaccent(coalesce(name_en, '')))) stored;

create index if not exists souls_name_vi_unaccent_trgm
  on public.souls using gin (name_vi_unaccent gin_trgm_ops);
create index if not exists souls_name_en_unaccent_trgm
  on public.souls using gin (name_en_unaccent gin_trgm_ops);

-- ─── effects ─────────────────────────────────────────────────
alter table public.effects
  add column if not exists name_unaccent text
    generated always as (lower(public.f_unaccent(coalesce(name, '')))) stored,
  add column if not exists en_name_unaccent text
    generated always as (lower(public.f_unaccent(coalesce(en_name, '')))) stored;

create index if not exists effects_name_unaccent_trgm
  on public.effects using gin (name_unaccent gin_trgm_ops);
create index if not exists effects_en_name_unaccent_trgm
  on public.effects using gin (en_name_unaccent gin_trgm_ops);
