import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SoulForm } from '@/components/soul-form';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { SoulRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SoulEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === 'new';

  let initial: SoulRow;

  if (isNew) {
    initial = {
      id: '',
      name_vi: '',
      name_en: '',
      kind: 'normal',
      effects: [
        { pieces: 2, description: '' },
        { pieces: 4, description: '' },
      ],
      image: '',
      sort_index: 0,
    };
  } else {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('souls')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      return (
        <div className="card p-6 text-red-300">Lỗi: {error.message}</div>
      );
    }
    if (!data) notFound();
    initial = data as SoulRow;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={isNew ? '/souls' : `/souls/${initial.id}`}
          className="text-sm text-white/60 hover:text-white"
        >
          ← {isNew ? 'Danh sách' : 'Quay lại detail'}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {isNew ? 'Thêm Ngự hồn' : `Sửa: ${initial.name_vi || initial.id}`}
        </h1>
      </div>
      <SoulForm initial={initial} isNew={isNew} />
    </div>
  );
}
