/** Diacritic-folded + lowercased for picker search. Vietnamese `đ`/`Đ`
 *  don't decompose into combining marks, so we map them explicitly. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Resolve a stored image reference (bucket key or legacy `assets/...` path
 *  or full URL) to the public CDN URL. Returns empty string for empty input
 *  or when the env isn't configured. */
export function resolveStoredImage(stored: string): string {
  if (!stored) return '';
  if (/^https?:\/\//.test(stored)) return stored;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return '';
  const trimmed = stored.replace(/^(assets\/images\/|assets\/)/, '');
  return `${base.replace(/\/+$/, '')}/storage/v1/object/public/assets/${trimmed}`;
}
