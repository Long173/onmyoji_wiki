'use client';

import { useRef, useState } from 'react';
import {
  useFormContext,
  type FieldValues,
  type Path,
  type PathValue,
} from 'react-hook-form';

type ImageKind = 'shikigami' | 'souls' | 'effects' | 'skills';

/** Schema-agnostic image uploader. Generic over the surrounding RHF form so
 *  the same component works for shikigami, soul, and effect forms.
 *  `name`/`idField`/`rarityField` are typed `Path<T>` so renaming a column
 *  surfaces a compile error at the call site. */
export function ImageUploadField<T extends FieldValues>({
  name,
  kind,
  idField,
  rarityField,
}: {
  name: Path<T>;
  kind: ImageKind;
  idField: Path<T>;
  rarityField?: Path<T>;
}) {
  const { register, watch, setValue } = useFormContext<T>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stored = String(watch(name) ?? '');
  const id = String(watch(idField) ?? '');
  const rarity = rarityField
    ? String(watch(rarityField) ?? '').toLowerCase()
    : '';

  const previewUrl = resolveStored(stored);

  const handleFile = async (file: File) => {
    setError(null);
    if (!id) {
      setError('Điền ID trước khi upload.');
      return;
    }
    if (kind === 'shikigami' && !rarity) {
      setError('Chọn rarity trước khi upload.');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      fd.append('id', id);
      if (rarity) fd.append('rarity', rarity);
      // Server deletes the orphan when the new bucket path differs from
      // this old one (e.g., extension change or rarity change).
      if (stored) fd.append('oldPath', stored);

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = (await res.json()) as { path?: string; error?: string };
      if (!res.ok || !json.path) {
        setError(json.error ?? 'Upload thất bại');
        return;
      }
      setValue(name, json.path as PathValue<T, Path<T>>, {
        shouldDirty: true,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-white/30">
              (no image)
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            {...register(name)}
            className="input-field font-mono text-sm"
            placeholder={`${kind}/${kind === 'shikigami' ? '<rarity>/' : ''}<id>.webp`}
          />
          <p className="text-xs text-white/40">
            Đường dẫn trong bucket. Tự điền sau khi upload.
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded border border-white/20 px-3 py-1 text-sm hover:bg-white/5 disabled:opacity-50"
            >
              {busy ? 'Đang upload...' : 'Chọn ảnh'}
            </button>
            {stored && (
              <button
                type="button"
                onClick={() =>
                  setValue(name, '' as PathValue<T, Path<T>>, {
                    shouldDirty: true,
                  })
                }
                className="rounded border border-white/20 px-3 py-1 text-sm hover:bg-white/5"
              >
                Xoá đường dẫn
              </button>
            )}
          </div>
          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
      </div>
    </div>
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
