-- Onmyoji Wiki — initial schema.
-- Maps 1:1 with the bundled JSON shape so the existing Dart models keep working
-- (see lib/features/*/models/*.dart).
--
-- Idempotent: safe to re-run via `supabase db push` or pasting into the SQL editor.

-- ─────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "unaccent";   -- for future server-side VN search
create extension if not exists "pg_trgm";

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

-- Shikigami (Thức Thần).
-- Rarity enum mirrors the per-rarity JSON split: ssr / sr / sp / r / n.
create table if not exists public.shikigami (
  id                 text primary key,
  name_vi            text         not null default '',
  name_jp            text         not null default '',
  name_en            text         not null default '',
  friendly_name      text[]       not null default '{}',
  rarity             text         not null check (rarity in ('SSR','SR','SP','R','N')),
  role               text[]       not null default '{}',   -- attacker/defender/support/control
  description        text         not null default '',
  obtain             text[]       not null default '{}',
  stats              jsonb        not null default '{}'::jsonb,  -- {hp:{value,tier}, attack:{...}, ...}
  skills             jsonb        not null default '[]'::jsonb,  -- [{name,description,levels[],image,cost}]
  recommended_souls  text[]       not null default '{}',
  lore               text         not null default '',
  image              text         not null default '',           -- Storage key e.g. shikigami/ssr/tu_kim_than.webp
  source_url         text         not null default '',
  -- Preserve scraper ordering (newest-first from source). Lower = newer.
  sort_index         integer      not null default 0,
  created_at         timestamptz  not null default now(),
  updated_at         timestamptz  not null default now()
);

create index if not exists shikigami_rarity_idx     on public.shikigami (rarity);
create index if not exists shikigami_sort_idx       on public.shikigami (rarity, sort_index);
create index if not exists shikigami_role_idx       on public.shikigami using gin (role);
create index if not exists shikigami_name_vi_trgm   on public.shikigami using gin (name_vi gin_trgm_ops);
create index if not exists shikigami_name_en_trgm   on public.shikigami using gin (name_en gin_trgm_ops);

-- Souls (Ngự hồn).
create table if not exists public.souls (
  id          text primary key,
  name_vi     text         not null default '',
  name_en     text         not null default '',
  kind        text         not null check (kind in ('normal','boss')),
  effects     jsonb        not null default '[]'::jsonb,   -- [{pieces:int, description:text}]
  image       text         not null default '',
  sort_index  integer      not null default 0,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create index if not exists souls_kind_idx        on public.souls (kind);
create index if not exists souls_name_vi_trgm    on public.souls using gin (name_vi gin_trgm_ops);
create index if not exists souls_name_en_trgm    on public.souls using gin (name_en gin_trgm_ops);

-- Effects (Hiệu ứng).
create table if not exists public.effects (
  id           text primary key,
  name         text         not null default '',
  en_name      text         not null default '',
  kind         text         not null check (kind in ('buff','debuff','other')),
  description  text         not null default '',
  image        text         not null default '',
  sort_index   integer      not null default 0,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);

create index if not exists effects_kind_idx       on public.effects (kind);
create index if not exists effects_name_trgm      on public.effects using gin (name gin_trgm_ops);

-- Manifest.
-- Single source of truth for "is the client's cache stale?" — a per-collection
-- monotonic version + a global content_version (bump on any change). Client
-- compares cached version to server version and re-syncs only the diff.
create table if not exists public.manifest (
  collection       text         primary key,           -- 'shikigami' | 'souls' | 'effects'
  version          bigint       not null default 1,
  content_hash     text         not null default '',   -- sha256 of canonical JSON, for double-check
  row_count        integer      not null default 0,
  updated_at       timestamptz  not null default now()
);

-- Seed manifest rows (idempotent).
insert into public.manifest (collection) values
  ('shikigami'), ('souls'), ('effects')
on conflict (collection) do nothing;

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────
create or replace function public._touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['shikigami','souls','effects','manifest']
  loop
    execute format('drop trigger if exists trg_touch_updated_at on public.%I', t);
    execute format(
      'create trigger trg_touch_updated_at before update on public.%I
       for each row execute function public._touch_updated_at()', t);
  end loop;
end$$;
