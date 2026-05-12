'use client';

import { useMemo, useState } from 'react';

import { normalize, resolveStoredImage } from '@/lib/picker-utils';

/** Display payload for one option in [ReferencePicker]. The caller's
 *  entity-specific wrapper maps DB rows to this shape; the picker itself
 *  knows nothing about souls/effects/shikigami. */
export interface PickerItem {
  id: string;
  /** Bucket-relative path or full URL — empty disables the thumbnail. */
  thumbPath?: string;
  /** Main label shown in chip + row. */
  primary: string;
  /** Optional italic subtitle in row only. */
  secondary?: string;
  /** Optional badge chip (rarity, kind, etc.). */
  badgeLabel?: string;
  /** Tailwind classes for the badge — controlled by the caller for theming. */
  badgeClass?: string;
  /** Pre-normalized search haystack; built by the caller so the picker
   *  doesn't need to know which fields matter. */
  searchHaystack: string;
}

/** Generic multi-select picker. Stateless w.r.t. form integration — wrappers
 *  pass current `selectedIds` and an `onChange` that writes back to RHF. */
export function ReferencePicker({
  items,
  selectedIds,
  onChange,
  searchPlaceholder = 'Tìm...',
  emptyHint = 'Chưa chọn gì.',
  maxListHeight = 'max-h-72',
}: {
  items: PickerItem[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
  emptyHint?: string;
  /** Tailwind `max-h-*` for the scrolling list region. Use a smaller value
   *  (e.g. `max-h-48`) when embedding inside nested rows. */
  maxListHeight?: string;
}) {
  const [query, setQuery] = useState('');

  const byId = useMemo(
    () => new Map(items.map((i) => [i.id, i])),
    [items],
  );

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const selectedSet = new Set(selectedIds);
    return items
      .filter((i) => !selectedSet.has(i.id))
      .filter((i) => !q || i.searchHaystack.includes(q));
  }, [items, selectedIds, query]);

  const toggle = (id: string, add: boolean) => {
    const next = add
      ? [...selectedIds, id]
      : selectedIds.filter((x) => x !== id);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const item = byId.get(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-gold)]/30 bg-[var(--color-brand-gold)]/10 py-1 pl-1 pr-3 text-sm"
              >
                <Thumb path={item?.thumbPath ?? ''} alt={item?.primary ?? id} />
                <span>
                  {item ? (
                    item.primary
                  ) : (
                    <span
                      className="text-red-300"
                      title="Id không còn trong DB"
                    >
                      {id} ⚠
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(id, false)}
                  className="text-white/50 hover:text-red-300"
                  aria-label={`Bỏ ${id}`}
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-white/40">{emptyHint}</p>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        className="input-field"
      />

      <div
        className={`${maxListHeight} overflow-y-auto rounded-lg border border-white/10 bg-black/20`}
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-white/40">
            {selectedIds.length === items.length
              ? 'Đã chọn hết.'
              : 'Không có item nào khớp.'}
          </p>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id, true)}
              className="flex w-full items-center gap-3 border-b border-white/5 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-white/[0.04]"
            >
              <Thumb path={item.thumbPath ?? ''} alt={item.primary} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{item.primary}</div>
                {item.secondary && (
                  <div className="truncate text-xs italic text-white/40">
                    {item.secondary}
                  </div>
                )}
              </div>
              {item.badgeLabel && (
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${item.badgeClass ?? 'bg-white/10 text-white/60'}`}
                >
                  {item.badgeLabel}
                </span>
              )}
              <span className="text-xs text-white/30">+</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function Thumb({ path, alt }: { path: string; alt: string }) {
  const url = resolveStoredImage(path);
  return (
    <span className="block h-8 w-8 shrink-0 overflow-hidden rounded bg-black/40">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      ) : null}
    </span>
  );
}
