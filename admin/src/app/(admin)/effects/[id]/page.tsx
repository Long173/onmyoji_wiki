import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EffectForm } from '@/components/effect-form';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { EffectRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EffectEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === 'new';

  let initial: EffectRow;

  if (isNew) {
    initial = {
      id: '',
      name: '',
      en_name: '',
      kind: 'buff',
      description: '',
      image: '',
      sort_index: 0,
    };
  } else {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('effects')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      return (
        <div className="card p-6 text-red-300">Lỗi: {error.message}</div>
      );
    }
    if (!data) notFound();
    initial = data as EffectRow;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/effects"
          className="text-sm text-white/60 hover:text-white"
        >
          ← Danh sách
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {isNew ? 'Thêm Hiệu ứng' : initial.name || initial.id}
        </h1>
      </div>
      <EffectForm initial={initial} isNew={isNew} />
    </div>
  );
}
