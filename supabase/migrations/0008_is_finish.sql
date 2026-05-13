-- Editorial "done" flag — used by the admin to mark records whose data has
-- been fully filled out vs. still-incomplete drafts. Not surfaced in the
-- public Flutter app (which always reads the latest row regardless).
--
-- Defaults to false so the bulk-imported scraped data starts as "pending"
-- and gets promoted to "done" once a human has reviewed/completed it.

alter table public.shikigami
  add column if not exists is_finish boolean not null default false;
alter table public.souls
  add column if not exists is_finish boolean not null default false;
alter table public.effects
  add column if not exists is_finish boolean not null default false;
