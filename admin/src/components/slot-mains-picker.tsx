'use client';

import { useFormContext } from 'react-hook-form';

import type { ShikigamiFormValues } from '@/lib/schemas';
import {
  SLOT_MAIN_OPTIONS,
  SLOT_NUMBERS,
  MAIN_STAT_LABELS,
  type SlotNumber,
} from '@/lib/types';

/** Three rows of chip toggles — slot 2 / 4 / 6 — each letting the user
 *  multi-select recommended main stats from the slot's allowed set. State
 *  flows through the surrounding `ShikigamiForm` via RHF, written to
 *  `slot_mains.<slot>`. Empty array = "no recommendation". */
export function SlotMainsPicker() {
  const { watch, setValue } = useFormContext<ShikigamiFormValues>();

  const toggle = (slot: SlotNumber, stat: string) => {
    const current = watch(`slot_mains.${slot}`) ?? [];
    const next = current.includes(stat)
      ? current.filter((s) => s !== stat)
      : [...current, stat];
    setValue(`slot_mains.${slot}`, next, { shouldDirty: true });
  };

  return (
    <div className="space-y-3">
      {SLOT_NUMBERS.map((slot) => {
        const selected = watch(`slot_mains.${slot}`) ?? [];
        return (
          <div
            key={slot}
            className="rounded-lg border border-white/10 bg-black/20 p-3"
          >
            <div className="mb-2 flex items-center gap-3 text-xs uppercase text-white/60">
              <span className="rounded bg-[var(--color-brand-gold)]/20 px-2 py-0.5 font-semibold text-[var(--color-brand-gold)]">
                Slot {slot}
              </span>
              <span className="text-white/40">
                {selected.length > 0
                  ? `${selected.length} đã chọn`
                  : 'Chưa chọn (= không có khuyến nghị)'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SLOT_MAIN_OPTIONS[slot].map((stat) => {
                const on = selected.includes(stat);
                return (
                  <button
                    key={stat}
                    type="button"
                    onClick={() => toggle(slot, stat)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      on
                        ? 'bg-[var(--color-brand-gold)] text-[var(--color-ink)]'
                        : 'border border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    {MAIN_STAT_LABELS[stat] ?? stat}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
