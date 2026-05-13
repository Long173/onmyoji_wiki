'use client';

import Link from 'next/link';

/**
 * Small "✎ Sửa" link rendered inside a list row. Stops the click /
 * keydown events from bubbling so the surrounding ClickableRow (which
 * navigates to the detail page on row click) doesn't also fire — clicking
 * the button goes straight to /edit without bouncing through detail.
 *
 * Renders as a real <Link>, so Cmd+click still opens edit in a new tab
 * and middle-click works.
 */
export function RowEditButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 transition-colors hover:border-[var(--color-brand-gold)]/40 hover:bg-white/[0.08] hover:text-white"
      title="Sửa nhanh"
    >
      ✎ Sửa
    </Link>
  );
}
