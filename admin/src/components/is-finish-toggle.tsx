'use client';

import { useFormContext, type FieldValues, type Path } from 'react-hook-form';

/**
 * Checkbox toggle for the editorial `is_finish` flag. Generic over the form
 * shape so all 3 forms (shikigami / soul / effect) can use it. Renders as
 * a labelled checkbox with a hint explaining the purpose.
 */
export function IsFinishToggle<T extends FieldValues>({
  name,
}: {
  name: Path<T>;
}) {
  const { register, watch } = useFormContext<T>();
  const value = Boolean(watch(name));

  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
        value
          ? 'border-emerald-500/40 bg-emerald-500/10'
          : 'border-white/10 bg-black/20 hover:border-white/20'
      }`}
    >
      <input
        type="checkbox"
        {...register(name)}
        className="mt-0.5 h-4 w-4 accent-emerald-500"
      />
      <span className="flex-1">
        <span
          className={`block text-sm font-semibold ${
            value ? 'text-emerald-300' : 'text-white/80'
          }`}
        >
          {value ? '✓ Đã hoàn thành' : 'Chưa hoàn thành'}
        </span>
        <span className="block text-xs text-white/50">
          Đánh dấu khi data record này đã đầy đủ. Dùng để lọc record còn
          thiếu sót.
        </span>
      </span>
    </label>
  );
}
