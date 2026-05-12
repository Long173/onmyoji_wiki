-- Counter relationships between shikigami.
--
-- `countered_by` : ids of shikigami that are strong against this one.
-- The inverse direction ("who do I counter") is intentionally derived at
-- query time (`select * from shikigami where '<id>' = any(countered_by)`) to
-- avoid storing redundant + de-syncable data.
--
-- Stored as text[] (same shape as recommended_souls) so the admin picker
-- can reuse the same generic UI. No foreign-key constraint — the upload
-- pipeline mass-rewrites rows in arbitrary order and a hard FK would create
-- chicken/egg issues during sync. The admin UI flags missing ids in red so
-- dangling references are obvious.
alter table public.shikigami
  add column if not exists countered_by text[] not null default '{}';

create index if not exists shikigami_countered_by_gin
  on public.shikigami using gin (countered_by);
