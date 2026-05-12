'use client';

import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { normalize } from '@/lib/picker-utils';
import type { ShikigamiFormValues } from '@/lib/schemas';

import { ReferencePicker, type PickerItem } from './reference-picker';

export interface SoulOption {
  id: string;
  name_vi: string;
  name_en: string;
  kind: 'normal' | 'boss';
  image: string;
}

const KIND_STYLE: Record<SoulOption['kind'], { label: string; cls: string }> = {
  boss: { label: 'BOSS', cls: 'bg-red-500/20 text-red-300' },
  normal: { label: 'NORMAL', cls: 'bg-amber-500/20 text-amber-300' },
};

function soulToItem(o: SoulOption): PickerItem {
  const kind = KIND_STYLE[o.kind];
  return {
    id: o.id,
    thumbPath: o.image,
    primary: o.name_vi || o.name_en || o.id,
    secondary: o.name_vi && o.name_en ? o.name_en : undefined,
    badgeLabel: kind.label,
    badgeClass: kind.cls,
    searchHaystack: normalize(`${o.name_vi} ${o.name_en} ${o.id}`),
  };
}

export function SoulPickerField({ options }: { options: SoulOption[] }) {
  const { setValue, watch } = useFormContext<ShikigamiFormValues>();
  const selectedIds = (watch('recommended_souls') ?? []) as string[];

  const items = useMemo(() => options.map(soulToItem), [options]);

  return (
    <ReferencePicker
      items={items}
      selectedIds={selectedIds}
      onChange={(next) =>
        setValue('recommended_souls', next, { shouldDirty: true })
      }
      searchPlaceholder="Tìm ngự hồn để thêm (gõ không dấu OK)..."
      emptyHint="Chưa chọn ngự hồn nào."
    />
  );
}
