'use client';

import { useRouter } from 'next/navigation';

/** Table row whose entire surface is clickable. Uses programmatic
 *  navigation rather than a wrapping `<a>` because `<a>` can't legally
 *  contain `<tr>`. Cmd/Ctrl + click opens the destination in a new tab,
 *  matching native link behaviour. */
export function ClickableRow({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) {
          window.open(href, '_blank', 'noopener');
        } else {
          router.push(href);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(href);
        }
      }}
      className="cursor-pointer border-t border-white/5 transition-colors hover:bg-white/[0.04] focus:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]/40"
    >
      {children}
    </tr>
  );
}
