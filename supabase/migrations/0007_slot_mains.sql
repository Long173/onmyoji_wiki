-- Recommended main stats per soul slot (slots 2 / 4 / 6 are the choice slots;
-- 1/3/5 are fixed at ATK/DEF/HP).
--
-- Stored as a JSONB object keyed by slot number (string) → array of stat
-- keys. Examples:
--   {}                                           — no recommendation set
--   {"2": ["atk_pct", "spd"]}                    — only slot 2 specified
--   {"2": ["atk_pct"], "4": ["acc_pct"],
--    "6": ["crit_pct", "crit_dmg_pct"]}          — full set
--
-- Allowed stat keys (validated client-side, not via DB constraint):
--   slot 2: atk_pct, spd, def_pct, hp_pct
--   slot 4: atk_pct, def_pct, hp_pct, acc_pct, res_pct
--   slot 6: atk_pct, def_pct, hp_pct, crit_pct, crit_dmg_pct
--
-- Kept as JSONB (not 3 separate text[] columns) because we never query by
-- it — just store + render. One column is simpler for Excel I/O and future
-- extension (if NetEase adds new choice slots).
alter table public.shikigami
  add column if not exists slot_mains jsonb not null default '{}'::jsonb;
