import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ShikigamiForm } from '@/components/shikigami-form';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { emptyStats, type ShikigamiRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ShikigamiEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === 'new';

  let initial: ShikigamiRow;

  if (isNew) {
    initial = {
      id: '',
      name_vi: '',
      name_jp: '',
      name_en: '',
      friendly_name: [],
      rarity: 'SSR',
      description: '',
      obtain: [],
      stats: emptyStats(),
      skills: [],
      recommended_souls: [],
      lore: '',
      image: '',
      source_url: '',
      sort_index: 0,
    };
  } else {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('shikigami')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      return (
        <div className="card p-6 text-red-300">
          Lỗi: {error.message}
        </div>
      );
    }
    if (!data) notFound();
    initial = {
      ...(data as ShikigamiRow),
      stats: { ...emptyStats(), ...(data as ShikigamiRow).stats },
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/shikigami"
            className="text-sm text-white/60 hover:text-white"
          >
            ← Danh sách
          </Link>
          <h1 className="mt-2 text-2xl font-bold">
            {isNew ? 'Thêm Thức Thần' : initial.name_vi || initial.id}
          </h1>
        </div>
      </div>
      <ShikigamiForm initial={initial} isNew={isNew} />
    </div>
  );
}
