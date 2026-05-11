'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';

import type { ShikigamiFormValues } from '@/lib/schemas';

export function SkillsEditor() {
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
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs text-white/60">
                Icon path (bucket key)
              </span>
              <input
                {...register(`skills.${skillIdx}.image` as const)}
                className="input-field font-mono text-sm"
                placeholder="skills/6001.webp"
              />
              <span className="mt-1 block text-xs text-white/40">
                Tham chiếu đến file trong bucket. Có thể để trống — UI
                fallback dùng STT.
              </span>
            </label>
          </div>

          <SkillLevelsEditor skillIdx={skillIdx} />
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
