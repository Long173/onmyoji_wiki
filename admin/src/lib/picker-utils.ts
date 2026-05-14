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
 *  or when the env isn't configured.
 *
 *  When `cacheBust` is true, appends a `?t=<Date.now()>` so each render
 *  forces the CDN and browser to refetch — needed in the admin so that
 *  files replaced directly in the Supabase Storage dashboard show up on
 *  the next page load instead of waiting for the 1h CDN TTL.
 *
 *  Only enable cache-busting in server-rendered admin pages (list / detail).
 *  Client components that re-render frequently (form previews, pickers)
 *  should leave it off — otherwise every re-render refetches the image
 *  unnecessarily. */
export function resolveStoredImage(
  stored: string,
  cacheBust = false,
): string {
  if (!stored) return '';
  if (/^https?:\/\//.test(stored)) return stored;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return '';
  const trimmed = stored.replace(/^(assets\/images\/|assets\/)/, '');
  const url = `${base.replace(/\/+$/, '')}/storage/v1/object/public/assets/${trimmed}`;
  if (!cacheBust) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}t=${Date.now()}`;
}
