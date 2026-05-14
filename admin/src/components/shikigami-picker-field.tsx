'use client';

import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { normalize } from '@/lib/picker-utils';
import type { ShikigamiFormValues } from '@/lib/schemas';
import type { Rarity } from '@/lib/types';

import { ReferencePicker, type PickerItem } from './reference-picker';

export interface ShikigamiOption {
  id: string;
  name_vi: string;
  name_en: string;
  rarity: Rarity;
  image: string;
}

const RARITY_STYLE: Record<Rarity, string> = {
  SSR: 'bg-amber-500/20 text-amber-300',
  SP: 'bg-fuchsia-500/20 text-fuchsia-300',
  SR: 'bg-violet-500/20 text-violet-300',
  R: 'bg-sky-500/20 text-sky-300',
  N: 'bg-white/10 text-white/60',
};

function shikigamiToItem(o: ShikigamiOption): PickerItem {
  return {
    id: o.id,
    thumbPath: o.image,
    primary: o.name_vi || o.name_en || o.id,
    secondary: o.name_vi && o.name_en ? o.name_en : undefined,
    badgeLabel: o.rarity,
    badgeClass: RARITY_STYLE[o.rarity],
    searchHaystack: normalize(`${o.name_vi} ${o.name_en} ${o.id}`),
  };
}

/** Picker for shikigami-references — used for both `counters` and
 *  `countered_by`. Filters out the record currently being edited so a
 *  shikigami can't reference itself. */
export function ShikigamiReferencePicker({
  options,
  excludeId,
  searchPlaceholder,
  emptyHint,
}: {
  options: ShikigamiOption[];
  excludeId: string;
  searchPlaceholder?: string;
  emptyHint?: string;
}) {
  const { setValue, watch } = useFormContext<ShikigamiFormValues>();
  const selectedIds = (watch('countered_by') ?? []) as string[];

  const items = useMemo(
    () => options.filter((o) => o.id !== excludeId).map(shikigamiToItem),
    [options, excludeId],
  );

  return (
    <ReferencePicker
      items={items}
      selectedIds={selectedIds}
      onChange={(next) =>
        setValue('countered_by', next, { shouldDirty: true })
      }
      searchPlaceholder={searchPlaceholder ?? 'Tìm Thức Thần...'}
      emptyHint={emptyHint ?? 'Chưa chọn Thức Thần nào.'}
    />
  );
}
