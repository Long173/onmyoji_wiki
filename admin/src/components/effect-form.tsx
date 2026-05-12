'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { deleteEffect, saveEffect } from '@/app/(admin)/effects/[id]/actions';
import { resolveStoredImage } from '@/lib/picker-utils';
import { effectFormSchema, type EffectFormValues } from '@/lib/schemas';
import type { EffectRow, Rarity } from '@/lib/types';

import { ImageUploadField } from './image-upload-field';
import type { ShikigamiOption } from './shikigami-picker-field';

export function EffectForm({
  initial,
  isNew,
  referencedBy,
}: {
  initial: EffectRow;
  isNew: boolean;
  referencedBy: ShikigamiOption[];
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
      if (isNew) router.push(`/effects/${res.id}`);
      else router.refresh();
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
        <Section title="Định danh">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="ID (slug)" required>
              <input
                {...methods.register('id')}
                disabled={!isNew}
                className="input-field font-mono"
                placeholder="atk_up"
              />
            </Field>
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

        {!isNew && (
          <Section
            title={`Thức Thần dùng hiệu ứng này (${referencedBy.length})`}
          >
            <ReferencedByList items={referencedBy} />
            <p className="text-xs text-white/40">
              Read-only — quan hệ tag ở phía Thức Thần (skill.effects). Sửa
              tag bằng cách vào edit từng Thức Thần.
            </p>
          </Section>
        )}

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

const RARITY_STYLE: Record<Rarity, string> = {
  SSR: 'bg-amber-500/20 text-amber-300',
  SP: 'bg-fuchsia-500/20 text-fuchsia-300',
  SR: 'bg-violet-500/20 text-violet-300',
  R: 'bg-sky-500/20 text-sky-300',
  N: 'bg-white/10 text-white/60',
};

function ReferencedByList({ items }: { items: ShikigamiOption[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-white/40">
        Chưa có Thức Thần nào tag hiệu ứng này trong skill.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((s) => {
        const url = resolveStoredImage(s.image);
        const display = s.name_vi || s.name_en || s.id;
        return (
          <Link
            key={s.id}
            href={`/shikigami/${s.id}`}
            className="group flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-2 transition-colors hover:border-[var(--color-brand-gold)]/40 hover:bg-white/[0.04]"
          >
            <span className="block h-10 w-10 shrink-0 overflow-hidden rounded bg-black/40">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={display}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{display}</div>
              {s.name_vi && s.name_en && (
                <div className="truncate text-xs italic text-white/40">
                  {s.name_en}
                </div>
              )}
            </div>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${RARITY_STYLE[s.rarity]}`}
            >
              {s.rarity}
            </span>
            <span className="text-xs text-white/30 transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        );
      })}
    </div>
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
