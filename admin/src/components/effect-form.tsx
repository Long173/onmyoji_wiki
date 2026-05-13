'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { deleteEffect, saveEffect } from '@/app/(admin)/effects/[id]/edit/actions';
import { effectFormSchema, type EffectFormValues } from '@/lib/schemas';
import type { EffectRow } from '@/lib/types';

import { ImageUploadField } from './image-upload-field';
import { IsFinishToggle } from './is-finish-toggle';
import { SlugPreview } from './slug-preview';

export function EffectForm({
  initial,
  isNew,
}: {
  initial: EffectRow;
  isNew: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const methods = useForm<EffectFormValues>({
    resolver: zodResolver(effectFormSchema),
    defaultValues: initial as EffectFormValues,
  });

  const onSubmit = methods.handleSubmit(async (values) => {
    setBusy(true);
    try {
      const res = await saveEffect(values);
      if (!res.ok) {
        toast.error(`Không lưu được: ${res.error}`);
        return;
      }
      toast.success(
        isNew ? `Đã tạo "${res.id}"` : `Đã lưu "${values.name || res.id}"`,
      );
      if (isNew) {
        router.push(`/effects/${res.id}`);
      } else {
        // See shikigami-form for the rationale.
        if (typeof window !== 'undefined' && window.history.length > 2) {
          router.back();
          router.refresh();
        } else {
          router.replace(`/effects/${res.id}`);
        }
      }
    } finally {
      setBusy(false);
    }
  });

  const onDelete = async () => {
    if (!window.confirm(`Xoá vĩnh viễn "${initial.name || initial.id}"?`))
      return;
    setBusy(true);
    const res = await deleteEffect(initial.id);
    setBusy(false);
    if (!res.ok) {
      toast.error(`Không xoá được: ${res.error}`);
      return;
    }
    toast.success(`Đã xoá "${initial.name || initial.id}"`);
    router.push('/effects');
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} className="space-y-6">
        <IsFinishToggle<EffectFormValues> name="is_finish" />

        <Section title="Định danh">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {isNew ? (
              <Field label="ID (slug)">
                <SlugPreview source={['en_name', 'name']} />
              </Field>
            ) : (
              <Field label="ID (slug)" required>
                <input
                  {...methods.register('id')}
                  disabled
                  className="input-field font-mono"
                />
              </Field>
            )}
            <Field label="Loại" required>
              <select {...methods.register('kind')} className="input-field">
                <option value="buff">Buff (tăng)</option>
                <option value="debuff">Debuff (giảm)</option>
                <option value="other">Khác (thuật ngữ chung)</option>
              </select>
            </Field>
            <Field label="Tên Việt">
              <input
                {...methods.register('name')}
                className="input-field"
                placeholder="Tăng công"
              />
            </Field>
            <Field label="Tên Anh">
              <input
                {...methods.register('en_name')}
                className="input-field"
                placeholder="Attack Up"
              />
            </Field>
          </div>
        </Section>

        <Section title="Ảnh">
          <ImageUploadField<EffectFormValues>
            name="image"
            kind="effects"
            idField="id"
            slugSource={['en_name', 'name']}
          />
        </Section>

        <Section title="Mô tả">
          <Field label="Mô tả">
            <textarea
              {...methods.register('description')}
              rows={5}
              className="input-field"
              placeholder="Hiệu ứng này làm gì..."
            />
          </Field>
        </Section>

        <div className="sticky bottom-4 z-10">
          <div className="card flex items-center justify-between gap-4 p-4 shadow-lg">
            <span className="text-sm text-white/40">
              Lưu sẽ upsert thẳng vào Supabase.
            </span>
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
