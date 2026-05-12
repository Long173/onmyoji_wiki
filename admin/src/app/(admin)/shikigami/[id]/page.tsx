import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ShikigamiForm } from '@/components/shikigami-form';
import type { SoulOption } from '@/components/soul-picker-field';
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

  const supabase = createSupabaseAdmin();

  // Souls list — drives the picker for `recommended_souls`. Fetched in
  // parallel with the shikigami row to keep TTFB low.
  const soulsPromise = supabase
    .from('souls')
    .select('id,name_vi,name_en,kind,image')
    .order('kind')
    .order('sort_index');

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

  const soulsResult = await soulsPromise;
  const soulOptions = (soulsResult.data ?? []) as SoulOption[];

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
      <ShikigamiForm
        initial={initial}
        isNew={isNew}
        soulOptions={soulOptions}
      />
    </div>
  );
}
