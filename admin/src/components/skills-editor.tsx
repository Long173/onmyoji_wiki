'use client';

import { useRef, useState } from 'react';
import {
  useFieldArray,
  useFormContext,
  type Path,
} from 'react-hook-form';

import type { ShikigamiFormValues } from '@/lib/schemas';
import { slugify } from '@/lib/slugify';

import {
  SkillEffectsPicker,
  type EffectOption,
} from './effect-picker-field';

export function SkillsEditor({
  effectOptions,
}: {
  effectOptions: EffectOption[];
}) {
  const { control, register } = useFormContext<ShikigamiFormValues>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'skills',
  });

  return (
    <div className="space-y-4">
      {fields.map((field, skillIdx) => (
        <div
          key={field.id}
          className="rounded-lg border border-white/10 bg-black/20 p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[var(--color-brand-gold)]/20 px-2 py-0.5 text-xs font-semibold text-[var(--color-brand-gold)]">
                Skill {skillIdx + 1}
              </span>
            </div>
            <div className="flex gap-1 text-xs">
              <button
                type="button"
                onClick={() => skillIdx > 0 && move(skillIdx, skillIdx - 1)}
                disabled={skillIdx === 0}
                className="rounded px-2 py-1 hover:bg-white/5 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() =>
                  skillIdx < fields.length - 1 && move(skillIdx, skillIdx + 1)
                }
                disabled={skillIdx === fields.length - 1}
                className="rounded px-2 py-1 hover:bg-white/5 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(skillIdx)}
                className="rounded px-2 py-1 text-red-300 hover:bg-red-500/10"
              >
                Xoá
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-white/60">Tên</span>
              <input
                {...register(`skills.${skillIdx}.name` as const)}
                className="input-field"
                placeholder="DIỄM ĐỒ"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/60">
                Cost (HP/MP, để trống = 0)
              </span>
              <input
                type="number"
                {...register(`skills.${skillIdx}.cost` as const, {
                  setValueAs: (v) =>
                    v === '' || v === null ? undefined : Number(v),
                })}
                className="input-field"
              />
            </label>
            <div className="block md:col-span-2">
              <span className="mb-1 block text-xs text-white/60">
                Icon kỹ năng
              </span>
              <FormImageField
                pathPrefix={`skills.${skillIdx}`}
                bucketKeyFn={(shikigamiId) =>
                  `${shikigamiId}_${skillIdx + 1}`
                }
                missingNameMessage="Điền tên Thức Thần (Anh hoặc Việt) trước."
              />
            </div>
          </div>

          <SkillLevelsEditor skillIdx={skillIdx} />

          <div className="mt-4 border-t border-white/5 pt-4">
            <span className="mb-2 block text-xs uppercase text-white/50">
              Hiệu ứng tham chiếu
            </span>
            <SkillEffectsPicker
              path={`skills.${skillIdx}.effects` as const}
              options={effectOptions}
            />
          </div>

          <AltFormsEditor
            skillIdx={skillIdx}
            effectOptions={effectOptions}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          append({
            name: '',
            description: '',
            levels: [{ level: 1, description: '' }],
            image: '',
            effects: [],
            alt_forms: [],
          })
        }
        className="w-full rounded-lg border border-dashed border-white/20 py-3 text-sm text-white/60 hover:border-white/40 hover:text-white"
      >
        + Thêm kỹ năng
      </button>
    </div>
  );
}

function SkillLevelsEditor({ skillIdx }: { skillIdx: number }) {
  const { control, register } = useFormContext<ShikigamiFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `skills.${skillIdx}.levels` as const,
  });

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase text-white/50">
          Mô tả theo cấp độ
        </span>
        {fields.length < 5 && (
          <button
            type="button"
            onClick={() =>
              append({
                level: (fields.length + 1) as number,
                description: '',
              })
            }
            className="rounded border border-white/20 px-2 py-0.5 text-xs hover:bg-white/5"
          >
            + Lv{fields.length + 1}
          </button>
        )}
      </div>
      {fields.map((field, lvIdx) => (
        <div key={field.id} className="flex gap-2">
          <input
            type="number"
            {...register(`skills.${skillIdx}.levels.${lvIdx}.level` as const, {
              valueAsNumber: true,
            })}
            className="input-field w-16 text-center"
            min={1}
            max={5}
          />
          <textarea
            {...register(
              `skills.${skillIdx}.levels.${lvIdx}.description` as const,
            )}
            rows={2}
            className="input-field flex-1"
            placeholder="Mô tả kỹ năng cấp này"
          />
          <button
            type="button"
            onClick={() => remove(lvIdx)}
            className="rounded px-2 text-red-300 hover:bg-red-500/10"
          >
            ✕
          </button>
        </div>
      ))}
      {fields.length === 0 && (
        <p className="text-xs text-white/40">
          Chưa có level. Thêm Lv1 để bắt đầu.
        </p>
      )}
    </div>
  );
}

/** Editor for `skills.<i>.alt_forms` — same-slot transformations of the
 *  primary skill. Renders below the primary skill content. Each entry has
 *  its own name / image / description / effects picker (no levels, no
 *  cost — those belong to the primary form). */
function AltFormsEditor({
  skillIdx,
  effectOptions,
}: {
  skillIdx: number;
  effectOptions: EffectOption[];
}) {
  const { control, register } = useFormContext<ShikigamiFormValues>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `skills.${skillIdx}.alt_forms` as const,
  });

  return (
    <div className="mt-4 border-t border-white/5 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase text-white/50">
          Dạng phụ (cùng vị trí, đổi hình + hiệu ứng)
        </span>
        <button
          type="button"
          onClick={() =>
            append({ name: '', description: '', image: '', effects: [] })
          }
          className="rounded border border-white/20 px-2 py-0.5 text-xs hover:bg-white/5"
        >
          + Thêm dạng
        </button>
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-white/40">
          Chưa có dạng phụ. Skill chỉ có 1 dạng duy nhất.
        </p>
      )}

      <div className="space-y-3">
        {fields.map((field, altIdx) => (
          <div
            key={field.id}
            className="rounded-md border border-white/10 bg-black/15 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] uppercase text-white/50">
                Dạng {altIdx + 2}
              </span>
              <div className="flex gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => altIdx > 0 && move(altIdx, altIdx - 1)}
                  disabled={altIdx === 0}
                  className="rounded px-1.5 py-0.5 hover:bg-white/5 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() =>
                    altIdx < fields.length - 1 && move(altIdx, altIdx + 1)
                  }
                  disabled={altIdx === fields.length - 1}
                  className="rounded px-1.5 py-0.5 hover:bg-white/5 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(altIdx)}
                  className="rounded px-1.5 py-0.5 text-red-300 hover:bg-red-500/10"
                >
                  Xoá
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase text-white/50">
                  Tên dạng phụ
                </span>
                <input
                  {...register(
                    `skills.${skillIdx}.alt_forms.${altIdx}.name` as const,
                  )}
                  className="input-field"
                  placeholder="vd: Hồ Lư Phong (sau biến hình)"
                />
              </label>

              <div>
                <span className="mb-1 block text-[10px] uppercase text-white/50">
                  Icon dạng phụ
                </span>
                <FormImageField
                  pathPrefix={`skills.${skillIdx}.alt_forms.${altIdx}`}
                  bucketKeyFn={(shikigamiId) =>
                    `${shikigamiId}_${skillIdx + 1}_alt${altIdx + 1}`
                  }
                  missingNameMessage="Điền tên Thức Thần trước."
                />
              </div>

              <label className="block">
                <span className="mb-1 block text-[10px] uppercase text-white/50">
                  Mô tả
                </span>
                <textarea
                  {...register(
                    `skills.${skillIdx}.alt_forms.${altIdx}.description` as const,
                  )}
                  rows={2}
                  className="input-field"
                  placeholder="Mô tả dạng phụ"
                />
              </label>

              <div>
                <span className="mb-1 block text-[10px] uppercase text-white/50">
                  Hiệu ứng tham chiếu
                </span>
                <SkillEffectsPicker
                  path={
                    `skills.${skillIdx}.alt_forms.${altIdx}.effects` as Path<ShikigamiFormValues>
                  }
                  options={effectOptions}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Image upload field for skill icons — used by both primary skills and
 *  alt forms. Reads/writes `<pathPrefix>.image`, uploads under
 *  `skills/<bucketKey>.webp` where bucketKey is composed by the caller
 *  to encode skill index (and alt index when relevant). */
function FormImageField({
  pathPrefix,
  bucketKeyFn,
  missingNameMessage,
}: {
  pathPrefix: string;
  bucketKeyFn: (shikigamiId: string) => string;
  missingNameMessage: string;
}) {
  const { register, watch, setValue } = useFormContext<ShikigamiFormValues>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imagePath = `${pathPrefix}.image` as Path<ShikigamiFormValues>;

  // Same id-fallback pattern as ImageUploadField — when the shikigami is
  // brand new and has no slug yet, derive one from the name fields so the
  // upload can proceed before the first save.
  const realId = watch('id');
  const nameEn = watch('name_en');
  const nameVi = watch('name_vi');
  const fallbackId = slugify(nameEn || nameVi);
  const shikigamiId = realId || fallbackId;

  const stored = (watch(imagePath) as string | undefined) ?? '';
  const previewUrl = resolveStored(stored);

  const handleFile = async (file: File) => {
    setError(null);
    if (!shikigamiId) {
      setError(missingNameMessage);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'skills');
      fd.append('id', bucketKeyFn(shikigamiId));
      if (stored) fd.append('oldPath', stored);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = (await res.json()) as { path?: string; error?: string };
      if (!res.ok || !json.path) {
        setError(json.error ?? 'Upload thất bại');
        return;
      }
      setValue(imagePath, json.path as never, { shouldDirty: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-white/30">
              (none)
            </div>
          )}
        </div>
        <input
          {...register(imagePath)}
          className="input-field flex-1 font-mono text-xs"
          placeholder="skills/<id>.webp"
        />
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
          className="rounded border border-white/20 px-3 py-1 text-xs hover:bg-white/5 disabled:opacity-50"
        >
          {busy ? '...' : 'Chọn ảnh'}
        </button>
        {stored && (
          <button
            type="button"
            onClick={() =>
              setValue(imagePath, '' as never, { shouldDirty: true })
            }
            className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/5"
            title="Xoá đường dẫn"
          >
            ✕
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
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
