'use client';

import { useMemo } from 'react';
import { useFormContext, type Path } from 'react-hook-form';

import { normalize } from '@/lib/picker-utils';
import type { ShikigamiFormValues } from '@/lib/schemas';

import { ReferencePicker, type PickerItem } from './reference-picker';

export interface EffectOption {
  id: string;
  name: string;
  en_name: string;
  kind: 'buff' | 'debuff' | 'other';
  image: string;
}

const KIND_STYLE: Record<EffectOption['kind'], { label: string; cls: string }> =
  {
    buff: { label: 'BUFF', cls: 'bg-emerald-500/20 text-emerald-300' },
    debuff: { label: 'DEBUFF', cls: 'bg-red-500/20 text-red-300' },
    other: { label: 'KHÁC', cls: 'bg-white/10 text-white/60' },
  };

function effectToItem(o: EffectOption): PickerItem {
  const kind = KIND_STYLE[o.kind];
  return {
    id: o.id,
    thumbPath: o.image,
    primary: o.name || o.en_name || o.id,
    secondary: o.name && o.en_name ? o.en_name : undefined,
    badgeLabel: kind.label,
    badgeClass: kind.cls,
    searchHaystack: normalize(`${o.name} ${o.en_name} ${o.id}`),
  };
}

/** Effects picker writing to any `string[]` field on the form. Used by
 *  both primary skill rows and alt-form rows — caller passes the full
 *  RHF path (e.g. `skills.0.effects` or `skills.0.alt_forms.1.effects`).
 *  Compact list height since it lives embedded inside the skills editor. */
export function SkillEffectsPicker({
  path,
  options,
}: {
  path: Path<ShikigamiFormValues>;
  options: EffectOption[];
}) {
  const { setValue, watch } = useFormContext<ShikigamiFormValues>();
  const selectedIds = (watch(path) ?? []) as string[];

  const items = useMemo(() => options.map(effectToItem), [options]);

  return (
    <ReferencePicker
      items={items}
      selectedIds={selectedIds}
      onChange={(next) =>
        setValue(path, next as never, { shouldDirty: true })
      }
      searchPlaceholder="Tag hiệu ứng được dùng trong skill này..."
      emptyHint="Chưa tag hiệu ứng nào cho skill này."
      maxListHeight="max-h-48"
    />
  );
}
