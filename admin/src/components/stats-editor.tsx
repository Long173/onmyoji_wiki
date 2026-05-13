'use client';

import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import type { ShikigamiFormValues } from '@/lib/schemas';
import { STAT_TIERS, type StatTier } from '@/lib/types';

type StatKey = keyof ShikigamiFormValues['stats'];

const STAT_LABELS: Record<StatKey, string> = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  speed: 'SPD',
  crit_rate: 'Tỉ lệ chí mạng',
  crit_dmg: 'Sát thương chí mạng (%)',
  accuracy: 'Chính xác',
  resist: 'Kháng',
};

const STAT_KEYS: readonly StatKey[] = [
  'hp',
  'attack',
  'defense',
  'speed',
  'crit_rate',
  'crit_dmg',
  'accuracy',
  'resist',
];

// ─── Auto-tier mapping ────────────────────────────────────────────────
//
// Lower-bound thresholds per stat (inclusive). The first row a value
// clears wins. `crit_rate` values are stored as ints — "10" means 10%.
//
// Tier table from the design spec:
//   SS  ATK ≥ 3,500   HP ≥ 14,000   DEF ≥ 500   SPD ≥ 120   CRIT ≥ 15%
//   S       3,000–3,499  12,000–13,999  460–499  110–119  10–14%
//   A       2,500–2,999  10,000–11,999  400–459  105–109   8–9%
//   B       2,000–2,499   8,000– 9,999  350–399  100–104   5–7%
//   C       1,500–1,999   7,000– 7,999  300–349   95– 99   2–4%
//   D     < 1,500       <  7,000      < 300     < 95     0–1%
const TIER_THRESHOLDS: Partial<
  Record<StatKey, { SS: number; S: number; A: number; B: number; C: number }>
> = {
  attack: { SS: 3500, S: 3000, A: 2500, B: 2000, C: 1500 },
  hp: { SS: 14000, S: 12000, A: 10000, B: 8000, C: 7000 },
  defense: { SS: 500, S: 460, A: 400, B: 350, C: 300 },
  speed: { SS: 120, S: 110, A: 105, B: 100, C: 95 },
  crit_rate: { SS: 15, S: 10, A: 8, B: 5, C: 2 },
};

const TIER_CHIP: Record<StatTier, string> = {
  '': 'bg-white/5 text-white/40',
  D: 'bg-white/10 text-white/60',
  C: 'bg-sky-500/15 text-sky-300',
  B: 'bg-emerald-500/15 text-emerald-300',
  A: 'bg-violet-500/20 text-violet-300',
  S: 'bg-fuchsia-500/20 text-fuchsia-300',
  SS: 'bg-amber-500/20 text-amber-300',
};

/**
 * Derive the tier for `statKey` from its raw numeric value.
 *  - Returns `null` for stats without an auto-tier table (the form keeps
 *    the manual dropdown for those).
 *  - Returns `''` (cleared) when the value is missing/NaN — avoids the
 *    "NaN >= n → false for all" trap that would otherwise misreport D.
 */
function deriveTier(statKey: StatKey, value: unknown): StatTier | null {
  const thresholds = TIER_THRESHOLDS[statKey];
  if (!thresholds) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  if (value >= thresholds.SS) return 'SS';
  if (value >= thresholds.S) return 'S';
  if (value >= thresholds.A) return 'A';
  if (value >= thresholds.B) return 'B';
  if (value >= thresholds.C) return 'C';
  return 'D';
}

export function StatsEditor() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">
        Tier của ATK / HP / DEF / SPD / Tỉ lệ chí mạng sẽ tự cập nhật theo
        giá trị nhập vào (bảng quy chuẩn). Các stat còn lại điền tay nếu cần.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STAT_KEYS.map((key) => (
          <StatRow key={key} statKey={key} />
        ))}
      </div>
    </div>
  );
}

function StatRow({ statKey }: { statKey: StatKey }) {
  const { register, setValue, getValues, control } =
    useFormContext<ShikigamiFormValues>();
  const value = useWatch({ control, name: `stats.${statKey}.value` });
  const tier = useWatch({ control, name: `stats.${statKey}.tier` });
  const isAuto = statKey in TIER_THRESHOLDS;

  // Auto-derive tier whenever the value changes for known stats. We read
  // the current tier via getValues (not useWatch) so we don't re-subscribe
  // on each tier write — that prevents the dirty-state ping-pong.
  useEffect(() => {
    const derived = deriveTier(statKey, value);
    if (derived === null) return;
    const current = getValues(`stats.${statKey}.tier`);
    if (derived !== current) {
      setValue(`stats.${statKey}.tier`, derived as StatTier, {
        shouldDirty: true,
      });
    }
  }, [statKey, value, getValues, setValue]);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
      <span className="w-32 shrink-0 text-sm text-white/70">
        {STAT_LABELS[statKey]}
      </span>
      <input
        type="number"
        {...register(`stats.${statKey}.value` as const, {
          valueAsNumber: true,
        })}
        className="input-field w-24 text-right"
      />
      {isAuto ? (
        // Auto-tier: read-only chip mirroring the derived value. We still
        // register the field via a hidden input so RHF includes it on submit.
        <>
          <input
            type="hidden"
            {...register(`stats.${statKey}.tier` as const)}
          />
          <span
            className={`flex h-9 w-20 items-center justify-center rounded border border-white/10 text-sm font-semibold ${
              TIER_CHIP[(tier ?? '') as StatTier]
            }`}
            title="Tự cập nhật theo bảng quy chuẩn"
          >
            {tier || '—'}
          </span>
        </>
      ) : (
        <select
          {...register(`stats.${statKey}.tier` as const)}
          className="input-field max-w-[80px]"
        >
          {STAT_TIERS.map((t) => (
            <option key={t || 'none'} value={t}>
              {t || '—'}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
