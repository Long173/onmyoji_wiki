'use client';

import { useFormContext } from 'react-hook-form';

import type { ShikigamiFormValues } from '@/lib/schemas';
import { STAT_TIERS } from '@/lib/types';

const STAT_LABELS: Record<keyof ShikigamiFormValues['stats'], string> = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  speed: 'SPD',
  crit_rate: 'Tỉ lệ chí mạng',
  crit_dmg: 'Sát thương chí mạng (%)',
  accuracy: 'Chính xác',
  resist: 'Kháng',
};

// Per the model: only HP/ATK/DEF/SPD/Crit-rate render a tier badge in the
// Flutter app. crit_dmg/accuracy/resist accept tier in DB but the UI ignores
// it — we still show the dropdown here so editors can fill it for future use.
const STAT_KEYS = [
  'hp',
  'attack',
  'defense',
  'speed',
  'crit_rate',
  'crit_dmg',
  'accuracy',
  'resist',
] as const;

export function StatsEditor() {
  const { register } = useFormContext<ShikigamiFormValues>();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {STAT_KEYS.map((key) => (
        <div
          key={key}
          className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3"
        >
          <span className="w-32 shrink-0 text-sm text-white/70">
            {STAT_LABELS[key]}
          </span>
          <input
            type="number"
            {...register(`stats.${key}.value` as const, {
              valueAsNumber: true,
            })}
            className="input-field w-24 text-right"
          />
          <select
            {...register(`stats.${key}.tier` as const)}
            className="input-field max-w-[80px]"
          >
            {STAT_TIERS.map((t) => (
              <option key={t || 'none'} value={t}>
                {t || '—'}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
