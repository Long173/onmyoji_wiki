import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ShikigamiForm } from '@/components/shikigami-form';
import type { EffectOption } from '@/components/effect-picker-field';
import type { ShikigamiOption } from '@/components/shikigami-picker-field';
import type { SoulOption } from '@/components/soul-picker-field';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { emptySlotMains, emptyStats, type ShikigamiRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ShikigamiEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === 'new';

  const supabase = createSupabaseAdmin();

  // Reference lists — drive the 3 pickers. Fetched in parallel with the
  // shikigami row to keep TTFB low. Total payload ≈ 70KB at current scale
  // (64 souls + 83 effects + 126 shikigami).
  const soulsPromise = supabase
    .from('souls')
    .select('id,name_vi,name_en,kind,image')
    .order('kind')
    .order('sort_index');
  const effectsPromise = supabase
    .from('effects')
    .select('id,name,en_name,kind,image')
    .order('kind')
    .order('sort_index');
  const shikigamiListPromise = supabase
    .from('shikigami')
    .select('id,name_vi,name_en,name_jp,rarity,image')
    .order('rarity')
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
      slot_mains: emptySlotMains(),
      countered_by: [],
      lore: '',
      image: '',
      source_url: '',
      sort_index: 0,
      is_finish: false,
    };
  } else {
    const { data, error } = await supabase
      .from('shikigami')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      return (
        <div className="card p-6 text-red-300">Lỗi: {error.message}</div>
      );
    }
    if (!data) notFound();
    const row = data as ShikigamiRow;
    initial = {
      ...row,
      stats: { ...emptyStats(), ...row.stats },
      slot_mains: { ...emptySlotMains(), ...(row.slot_mains ?? {}) },
      countered_by: row.countered_by ?? [],
      is_finish: row.is_finish ?? false,
    };
  }

  const [soulsResult, effectsResult, shikigamiListResult] = await Promise.all([
    soulsPromise,
    effectsPromise,
    shikigamiListPromise,
  ]);
  const soulOptions = (soulsResult.data ?? []) as SoulOption[];
  const effectOptions = (effectsResult.data ?? []) as EffectOption[];
  const shikigamiOptions = (shikigamiListResult.data ?? []) as ShikigamiOption[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={isNew ? '/shikigami' : `/shikigami/${initial.id}`}
            className="text-sm text-white/60 hover:text-white"
          >
            ← {isNew ? 'Danh sách' : 'Quay lại detail'}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">
            {isNew ? 'Thêm Thức Thần' : `Sửa: ${initial.name_vi || initial.id}`}
          </h1>
        </div>
      </div>
      <ShikigamiForm
        initial={initial}
        isNew={isNew}
        soulOptions={soulOptions}
        effectOptions={effectOptions}
        shikigamiOptions={shikigamiOptions}
      />
    </div>
  );
}
