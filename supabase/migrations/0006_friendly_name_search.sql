-- Diacritic-insensitive substring search for `shikigami.friendly_name` (text[]).
--
-- Mirrors the pattern in 0004: a generated `*_unaccent` column + GIN trgm
-- index so the admin picker / Flutter search can include community nicknames
-- alongside name_vi/name_en/name_jp.
--
-- friendly_name is a text[]; we flatten it with array_to_string before passing
-- through f_unaccent + lower. Empty arrays produce empty strings (harmless,
-- ilike against '%q%' simply won't match).

alter table public.shikigami
  add column if not exists friendly_name_unaccent text
    generated always as (
      lower(public.f_unaccent(array_to_string(coalesce(friendly_name, '{}'), ' ')))
    ) stored;

create index if not exists shikigami_friendly_name_unaccent_trgm
  on public.shikigami using gin (friendly_name_unaccent gin_trgm_ops);
