'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';

import { deleteSoul, saveSoul } from '@/app/(admin)/souls/[id]/actions';
import { soulFormSchema, type SoulFormValues } from '@/lib/schemas';
import type { SoulRow } from '@/lib/types';

import { ImageUploadField } from './image-upload-field';

const PIECE_SUGGESTIONS: Record<SoulFormValues['kind'], number[]> = {
  normal: [2, 4],
  boss: [1, 2],
};

export function SoulForm({
  initial,
  isNew,
}: {
  initial: SoulRow;
  isNew: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const methods = useForm<SoulFormValues>({
    resolver: zodResolver(soulFormSchema),
    defaultValues: initial as SoulFormValues,
  });

  const onSubmit = methods.handleSubmit(async (values) => {
    setError(null);
    setBusy(true);
    try {
      const res = await saveSoul(values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (isNew) router.push(`/souls/${res.id}`);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  });

  const onDelete = async () => {
    if (!window.confirm(`Xoá vĩnh viễn "${initial.name_vi || initial.id}"?`))
      return;
    setBusy(true);
    const res = await deleteSoul(initial.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push('/souls');
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} className="space-y-6">
        <Section title="Định danh">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="ID (slug)" required>
              <input
                {...methods.register('id')}
                disabled={!isNew}
                className="input-field font-mono"
                placeholder="shiranui"
              />
            </Field>
            <Field label="Loại" required>
              <select {...methods.register('kind')} className="input-field">
                <option value="normal">Ngự thường (2/4 mảnh)</option>
                <option value="boss">Ngự boss (1/2 mảnh)</option>
              </select>
            </Field>
            <Field label="Tên Việt">
              <input
                {...methods.register('name_vi')}
                className="input-field"
              />
            </Field>
            <Field label="Tên Anh">
              <input
                {...methods.register('name_en')}
                className="input-field"
              />
            </Field>
          </div>
        </Section>

        <Section title="Ảnh">
          <ImageUploadField<SoulFormValues>
            name="image"
            kind="souls"
            idField="id"
          />
        </Section>

        <Section title="Hiệu ứng theo mảnh">
          <SoulEffectsEditor />
        </Section>

        <div className="sticky bottom-4 z-10">
          <div className="card flex items-center justify-between gap-4 p-4 shadow-lg">
            {error ? (
              <span className="text-sm text-red-300">{error}</span>
            ) : (
              <span className="text-sm text-white/40">
                Lưu sẽ upsert thẳng vào Supabase.
              </span>
            )}
            <div className="flex gap-3">
              {!isNew && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={busy}
                  className="rounded border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Xoá
                </button>
              )}
              <button
                type="submit"
                disabled={busy}
                className="btn-primary hover:btn-primary-hover disabled:opacity-50"
              >
                {busy ? 'Đang lưu...' : isNew ? 'Tạo mới' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

function SoulEffectsEditor() {
  const { control, register, watch } = useFormContextSoul();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'effects',
  });
  const kind = watch('kind');
  const suggestions = PIECE_SUGGESTIONS[kind] ?? [2, 4];

  return (
    <div className="space-y-3">
      {fields.map((field, i) => (
        <div
          key={field.id}
          className="rounded-lg border border-white/10 bg-black/20 p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs uppercase text-white/60">
              <span>Effect {i + 1}</span>
              <span className="text-white/30">·</span>
              <label className="flex items-center gap-1">
                Mảnh:
                <input
                  type="number"
                  min={1}
                  max={6}
                  {...register(`effects.${i}.pieces` as const, {
                    valueAsNumber: true,
                  })}
                  className="input-field w-16 text-center"
                />
              </label>
              <span className="text-white/30">
                (gợi ý: {suggestions.join('/')})
              </span>
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="rounded px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
            >
              Xoá
            </button>
          </div>
          <textarea
            {...register(`effects.${i}.description` as const)}
            rows={2}
            className="input-field"
            placeholder="Mô tả hiệu ứng khi đủ N mảnh..."
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          append({ pieces: suggestions[fields.length] ?? 2, description: '' })
        }
        className="w-full rounded-lg border border-dashed border-white/20 py-3 text-sm text-white/60 hover:border-white/40 hover:text-white"
      >
        + Thêm effect
      </button>
    </div>
  );
}

// Local typed helper so editor doesn't import from this same file
import { useFormContext } from 'react-hook-form';
function useFormContextSoul() {
  return useFormContext<SoulFormValues>();
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-[var(--color-brand-gold)]">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-white/70">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}
