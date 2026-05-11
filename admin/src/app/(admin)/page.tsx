import Link from 'next/link';

import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createSupabaseAdmin();
  const [shikigami, souls, effects] = await Promise.all([
    supabase.from('shikigami').select('*', { count: 'exact', head: true }),
    supabase.from('souls').select('*', { count: 'exact', head: true }),
    supabase.from('effects').select('*', { count: 'exact', head: true }),
  ]);

  const stats = [
    { label: 'Thức Thần', count: shikigami.count ?? 0, href: '/shikigami' },
    { label: 'Ngự hồn', count: souls.count ?? 0, href: '/souls' },
    { label: 'Hiệu ứng', count: effects.count ?? 0, href: '/effects' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="card flex flex-col gap-2 p-6 hover:border-[var(--color-brand-gold)]/40"
          >
            <span className="text-sm text-white/60">{s.label}</span>
            <span className="text-3xl font-bold">{s.count}</span>
            <span className="text-xs text-white/40">Click to edit →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
