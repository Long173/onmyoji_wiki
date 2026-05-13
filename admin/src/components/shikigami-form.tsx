'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  saveShikigami,
  deleteShikigami,
} from '@/app/(admin)/shikigami/[id]/edit/actions';
import {
  shikigamiFormSchema,
  type ShikigamiFormValues,
} from '@/lib/schemas';
import { RARITIES, type ShikigamiRow } from '@/lib/types';

import {
  type EffectOption,
} from './effect-picker-field';
import { ImageUploadField } from './image-upload-field';
import { IsFinishToggle } from './is-finish-toggle';
import {
  ShikigamiReferencePicker,
  type ShikigamiOption,
} from './shikigami-picker-field';
import { SkillsEditor } from './skills-editor';
import { SlotMainsPicker } from './slot-mains-picker';
import { SlugPreview } from './slug-preview';
import { SoulPickerField, type SoulOption } from './soul-picker-field';
import { StatsEditor } from './stats-editor';
import { StringArrayField } from './string-array-field';

export function ShikigamiForm({
  initial,
  isNew,
  soulOptions,
  effectOptions,
  shikigamiOptions,
}: {
  initial: ShikigamiRow;
  isNew: boolean;
  soulOptions: SoulOption[];
  effectOptions: EffectOption[];
  shikigamiOptions: ShikigamiOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const methods = useForm<ShikigamiFormValues>({
    resolver: zodResolver(shikigamiFormSchema),
    defaultValues: initial as ShikigamiFormValues,
    mode: 'onSubmit',
  });

  const onSubmit = methods.handleSubmit(async (values) => {
    setBusy(true);
    try {
      const res = await saveShikigami(values);
      if (!res.ok) {
        toast.error(`Không lưu được: ${res.error}`);
        return;
      }
      toast.success(
        isNew ? `Đã tạo "${res.id}"` : `Đã lưu "${values.name_vi || res.id}"`,
      );
      if (isNew) {
        // Brand-new record — no prior history to unwind.
        router.push(`/shikigami/${res.id}`);
      } else {
        // Edit flow: pop the /edit entry from history so the user lands back
        // on the detail they came from, and pressing Back once more brings
        // them to the list (their pre-detail page). revalidatePath in the
        // server action ensures the detail rehydrates with fresh data.
        // Falls back to replace() when the user opened /edit directly via
        // URL and there's no detail underneath in the history stack.
        if (typeof window !== 'undefined' && window.history.length > 2) {
          router.back();
          router.refresh();
        } else {
          router.replace(`/shikigami/${res.id}`);
        }
      }
    } finally {
      setBusy(false);
    }
  });

  const onDelete = async () => {
    if (
      !window.confirm(
        `Xoá vĩnh viễn "${initial.name_vi || initial.id}"? Không thể hoàn tác.`,
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await deleteShikigami(initial.id);
    setBusy(false);
    if (!res.ok) {
      toast.error(`Không xoá được: ${res.error}`);
      return;
    }
    toast.success(`Đã xoá "${initial.name_vi || initial.id}"`);
    router.push('/shikigami');
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} className="space-y-6">
        {/* ─── Editorial status ────────────────── */}
        <IsFinishToggle<ShikigamiFormValues> name="is_finish" />

        {/* ─── Identity ─────────────────────────── */}
        <Section title="Định danh">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {isNew ? (
              <Field label="ID (slug)">
                <SlugPreview source={['name_en', 'name_vi']} />
                <Hint>
                  Tự sinh từ Tên Anh (ưu tiên) hoặc Tên Việt khi lưu. Trùng ID
                  sẽ tự thêm hậu tố _2, _3...
                </Hint>
              </Field>
            ) : (
              <Field label="ID (slug)" required>
                <input
                  {...methods.register('id')}
                  disabled
                  className="input-field font-mono"
                />
                <Hint>Không sửa được sau khi tạo (là khoá chính).</Hint>
              </Field>
            )}
            <Field label="Rarity" required>
              <select
                {...methods.register('rarity')}
                className="input-field"
              >
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
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
            <Field label="Tên Nhật">
              <input
                {...methods.register('name_jp')}
                className="input-field"
              />
            </Field>
            <Field label="Source URL">
              <input
                {...methods.register('source_url')}
                className="input-field"
                placeholder="https://..."
              />
            </Field>
          </div>
          <Field label="Biệt danh cộng đồng">
            <StringArrayField name="friendly_name" placeholder="Vd: Ngưu Không" />
          </Field>
        </Section>

        {/* ─── Image ─────────────────────────── */}
        <Section title="Ảnh">
          <ImageUploadField<ShikigamiFormValues>
            name="image"
            kind="shikigami"
            idField="id"
            rarityField="rarity"
            slugSource={['name_en', 'name_vi']}
          />
        </Section>

        {/* ─── Description / Lore ───────────── */}
        <Section title="Mô tả / Lore">
          <Field label="Mô tả ngắn">
            <textarea
              {...methods.register('description')}
              rows={3}
              className="input-field"
            />
          </Field>
          <Field label="Lore (câu chuyện)">
            <textarea
              {...methods.register('lore')}
              rows={6}
              className="input-field"
            />
          </Field>
        </Section>

        {/* ─── Stats ─────────────────────── */}
        <Section title="Chỉ số">
          <StatsEditor />
        </Section>

        {/* ─── Skills ──────────────────────── */}
        <Section title="Kỹ năng">
          <SkillsEditor effectOptions={effectOptions} />
        </Section>

        {/* ─── Recommended souls ────────────── */}
        <Section title="Ngự hồn đề xuất">
          <SoulPickerField options={soulOptions} />
          <div className="pt-2">
            <span className="mb-2 block text-xs uppercase text-white/50">
              Main stat đề xuất theo slot
            </span>
            <SlotMainsPicker />
          </div>
        </Section>

        {/* ─── Khắc chế bởi (countered_by) ──── */}
        <Section title="Khắc chế bởi (Countered by)">
          <ShikigamiReferencePicker
            options={shikigamiOptions}
            excludeId={initial.id}
            searchPlaceholder="Tìm Thức Thần khắc chế mình..."
            emptyHint="Chưa chọn Thức Thần nào."
          />
        </Section>

        {/* ─── Actions ────────────────────── */}
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

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-white/40">{children}</p>;
}
