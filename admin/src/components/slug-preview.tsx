'use client';

import { useFormContext, type FieldValues, type Path } from 'react-hook-form';

import { slugify } from '@/lib/slugify';

/**
 * Read-only field that previews the slug a save will produce. Watches the
 * given form field names in order, slugifies the first non-empty value, and
 * renders it as a disabled monospace string. Empty when no source has content.
 *
 * The server action does the same slugify (and handles _2/_3 conflicts), so
 * this is purely informational — but matches what the server will store.
 */
export function SlugPreview<T extends FieldValues>({
  source,
}: {
  source: Path<T>[];
}) {
  const { watch } = useFormContext<T>();
  const values = source.map((name) => watch(name) as unknown);
  const firstNonEmpty = values.find(
    (v) => typeof v === 'string' && v.trim().length > 0,
  ) as string | undefined;
  const slug = slugify(firstNonEmpty);

  return (
    <input
      type="text"
      value={slug || '(điền tên để tự sinh ID)'}
      disabled
      readOnly
      className="input-field font-mono text-white/50"
    />
  );
}
