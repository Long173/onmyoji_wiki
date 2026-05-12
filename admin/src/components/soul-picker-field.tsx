'use client';

import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import type { ShikigamiFormValues } from '@/lib/schemas';

export interface SoulOption {
  id: string;
  name_vi: string;
  name_en: string;
  kind: 'normal' | 'boss';
  image: string;
}

/** Multi-select picker for `recommended_souls`. Renders the actual souls
 *  fetched from the DB (passed via `options` from the server page) as a
 *  searchable list — diacritic-insensitive — with thumbnails. The form
 *  value is still a `string[]` of soul ids; schema unchanged. */
export function SoulPickerField({ options }: { options: SoulOption[] }) {
  const { setValue, watch } = useFormContext<ShikigamiFormValues>();
  const [query, setQuery] = useState('');

  const selectedIds = (watch('recommended_souls') ?? []) as string[];

  // Lookup map for chip rendering — preserves order from `selectedIds`.
  const byId = useMemo(
    () => new Map(options.map((o) => [o.id, o])),
    [options],
  );

  // Filter unselected options by diacritic-folded name + id.
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const selectedSet = new Set(selectedIds);
    return options
      .filter((o) => !selectedSet.has(o.id))
      .filter((o) => {
        if (!q) return true;
        return (
          normalize(o.name_vi).includes(q) ||
          normalize(o.name_en).includes(q) ||
          o.id.toLowerCase().includes(q)
        );
      });
  }, [options, selectedIds, query]);

  const toggle = (id: string, add: boolean) => {
    const next = add
      ? [...selectedIds, id]
      : selectedIds.filter((x) => x !== id);
    setValue('recommended_souls', next, { shouldDirty: true });
  };

  return (
    <div className="space-y-3">
      {/* ── Selected chips (in order of insertion) ─────────── */}
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const o = byId.get(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-gold)]/30 bg-[var(--color-brand-gold)]/10 py-1 pl-1 pr-3 text-sm"
              >
                <Thumb path={o?.image ?? ''} alt={o?.name_vi ?? id} />
                <span>
                  {o ? o.name_vi || o.name_en || o.id : (
                    <span className="text-red-300" title="Soul id không còn trong DB">
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
        <p className="text-xs text-white/40">Chưa chọn ngự hồn nào.</p>
      )}

      {/* ── Search ─────────────────────────────────────────── */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm ngự hồn để thêm (gõ không dấu OK)..."
        className="input-field"
      />

      {/* ── Filtered options list ──────────────────────────── */}
      <div className="max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-black/20">
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-white/40">
            {selectedIds.length === options.length
              ? 'Đã chọn hết.'
              : 'Không có ngự hồn nào khớp.'}
          </p>
        ) : (
          filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id, true)}
              className="flex w-full items-center gap-3 border-b border-white/5 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-white/[0.04]"
            >
              <Thumb path={o.image} alt={o.name_vi} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">
                  {o.name_vi || o.name_en || o.id}
                </div>
                {o.name_vi && o.name_en && (
                  <div className="truncate text-xs italic text-white/40">
                    {o.name_en}
                  </div>
                )}
              </div>
              <KindChip kind={o.kind} />
              <span className="text-xs text-white/30">+</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function Thumb({ path, alt }: { path: string; alt: string }) {
  const url = resolveStored(path);
  return (
    <span className="block h-8 w-8 shrink-0 overflow-hidden rounded bg-black/40">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      ) : null}
    </span>
  );
}

function KindChip({ kind }: { kind: 'normal' | 'boss' }) {
  const cls =
    kind === 'boss'
      ? 'bg-red-500/20 text-red-300'
      : 'bg-amber-500/20 text-amber-300';
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {kind === 'boss' ? 'BOSS' : 'NORMAL'}
    </span>
  );
}

function resolveStored(stored: string): string {
  if (!stored) return '';
  if (/^https?:\/\//.test(stored)) return stored;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return '';
  const trimmed = stored.replace(/^(assets\/images\/|assets\/)/, '');
  return `${base.replace(/\/+$/, '')}/storage/v1/object/public/assets/${trimmed}`;
}

/** Diacritic-folded + lowercased for search comparison. Handles Vietnamese
 *  `đ`/`Đ` explicitly since they don't decompose into combining marks. */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}
