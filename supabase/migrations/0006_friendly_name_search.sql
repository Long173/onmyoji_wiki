-- Diacritic-insensitive substring search for `shikigami.friendly_name` (text[]).
--
-- Mirrors the pattern in 0004: a generated `*_unaccent` column + GIN trgm
-- index so the admin picker / Flutter search can include community nicknames
-- alongside name_vi/name_en/name_jp.
--
-- friendly_name is a text[]; we flatten it with array_to_string before passing
-- through f_unaccent + lower. Generated columns require an IMMUTABLE
-- expression, and Postgres marks `array_to_string` as STABLE (because the
-- per-element output function isn't guaranteed immutable for arbitrary
-- types). For `text[]` the result is deterministic, so we wrap it in an
-- IMMUTABLE SQL function — same workaround as `f_unaccent` in 0004.

create or replace function public.f_array_join_space(text[])
returns text
language sql
immutable
parallel safe
as $$
  select array_to_string(coalesce($1, '{}'::text[]), ' ');
$$;

alter table public.shikigami
  add column if not exists friendly_name_unaccent text
    generated always as (
      lower(public.f_unaccent(public.f_array_join_space(friendly_name)))
    ) stored;

create index if not exists shikigami_friendly_name_unaccent_trgm
  on public.shikigami using gin (friendly_name_unaccent gin_trgm_ops);
