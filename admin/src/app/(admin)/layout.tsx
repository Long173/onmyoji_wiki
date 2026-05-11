import Link from 'next/link';

import { createSupabaseServer } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/sign-out-button';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-[var(--color-ink-soft)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-lg font-bold text-[var(--color-brand-gold)]"
            >
              Onmyoji Admin
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/shikigami" className="hover:text-white">
                Thức Thần
              </Link>
              <Link href="/souls" className="hover:text-white">
                Ngự hồn
              </Link>
              <Link href="/effects" className="hover:text-white">
                Hiệu ứng
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-white/60">{user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
