'use client';

import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import type { ShikigamiFormValues } from '@/lib/schemas';

/** Editor for a `string[]` column — chip list + add input.
 *  RHF FieldArray of strings needs the items wrapped in objects, but for
 *  primitive arrays we just useWatch + manual setValue to keep it simple. */
export function StringArrayField({
  name,
  placeholder,
}: {
  name: 'friendly_name' | 'obtain' | 'recommended_souls';
  placeholder?: string;
}) {
  const { control, register, getValues, setValue } =
    useFormContext<ShikigamiFormValues>();
  // useFieldArray requires object items — register the path as a primitive
  // array and drive it manually.
  void control;
  void register;
  const items = getValues(name) ?? [];
  const [draft, setDraft] = useState('');

  const commit = (next: string[]) => {
    setValue(name, next, { shouldDirty: true });
  };

  const addDraft = () => {
    const v = draft.trim();
    if (!v) return;
    if (items.includes(v)) {
      setDraft('');
      return;
    }
    commit([...items, v]);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <span
            key={`${it}-${i}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-sm"
          >
            {it}
            <button
              type="button"
              onClick={() => commit(items.filter((_, idx) => idx !== i))}
              className="text-white/40 hover:text-red-300"
              aria-label="Xoá"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addDraft();
            }
          }}
          placeholder={placeholder}
          className="input-field flex-1"
        />
        <button
          type="button"
          onClick={addDraft}
          className="rounded border border-white/20 px-3 py-1 text-sm hover:bg-white/5"
        >
          Thêm
        </button>
      </div>
    </div>
  );
}
