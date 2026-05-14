-- Drop the Japanese name from shikigami. Wiki is Vietnamese-language; the
-- field was rarely populated and just adds noise to the UI / search.
--
-- Order matters: drop the generated `name_jp_unaccent` column before its
-- source column, since the generated expression depends on `name_jp`.
-- Dropping a column auto-drops its indexes (incl. the GIN trgm one from
-- migration 0004) so no explicit `drop index` needed.

alter table public.shikigami drop column if exists name_jp_unaccent;
alter table public.shikigami drop column if exists name_jp;
