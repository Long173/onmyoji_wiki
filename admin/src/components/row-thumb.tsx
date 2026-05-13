import { resolveStoredImage } from '@/lib/picker-utils';

/**
 * 40×40 thumbnail used as the leading column in list tables (shikigami,
 * souls, effects). Falls back to a 1–2 letter initial chip when the record
 * has no image. Renders a plain `<img>` (not next/image) because list
 * tables paint many of these and we want minimal hydration cost — they're
 * all from Supabase Storage's CDN anyway.
 */
export function RowThumb({
  path,
  alt,
  fallback,
}: {
  /** Stored bucket key or legacy `assets/...` path or full URL. */
  path: string;
  /** Used for the `alt` text + as the source for fallback initials. */
  alt: string;
  /** Optional explicit fallback string; defaults to first 2 chars of `alt`. */
  fallback?: string;
}) {
  const url = resolveStoredImage(path);
  const initials = (fallback ?? alt.slice(0, 2)).toUpperCase().trim() || '?';

  return (
    <span className="block h-10 w-10 shrink-0 overflow-hidden rounded bg-black/30">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-white/40">
          {initials}
        </span>
      )}
    </span>
  );
}
