import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Onmyoji Wiki Admin',
  description: 'Edit Supabase data for the Onmyoji Wiki app.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      {/* Browser extensions (password managers, Grammarly, Dark Reader) inject
          attributes into the DOM after SSR, causing harmless hydration
          mismatches. suppressHydrationWarning silences just the body-level
          diff — it doesn't disable hydration checks for descendants. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
