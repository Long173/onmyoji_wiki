import Link from 'next/link';

import { ShikigamiForm } from '@/components/shikigami-form';
import type { EffectOption } from '@/components/effect-picker-field';
import type { ShikigamiOption } from '@/components/shikigami-picker-field';
import type { SoulOption } from '@/components/soul-picker-field';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { emptySlotMains, emptyStats, type ShikigamiRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Static route — see effects/new/page.tsx for why we can't re-export the edit
// page. We still need the 3 reference lists for the pickers, fetched in parallel.
export default async function ShikigamiNewPage() {
  const supabase = createSupabaseAdmin();

  const [soulsResult, effectsResult, shikigamiListResult] = await Promise.all([
    supabase
      .from('souls')
      .select('id,name_vi,name_en,kind,image')
      .order('kind')
      .order('sort_index'),
    supabase
      .from('effects')
      .select('id,name,en_name,kind,image')
      .order('kind')
      .order('sort_index'),
    supabase
      .from('shikigami')
      .select('id,name_vi,name_en,rarity,image')
      .order('rarity')
      .order('sort_index'),
  ]);

  const soulOptions = (soulsResult.data ?? []) as SoulOption[];
  const effectOptions = (effectsResult.data ?? []) as EffectOption[];
  const shikigamiOptions = (shikigamiListResult.data ?? []) as ShikigamiOption[];

  const initial: ShikigamiRow = {
    id: '',
    name_vi: '',
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
          <h1 className="mt-2 text-2xl font-bold">Thêm Thức Thần</h1>
        </div>
      </div>
      <ShikigamiForm
        initial={initial}
        isNew
        soulOptions={soulOptions}
        effectOptions={effectOptions}
        shikigamiOptions={shikigamiOptions}
      />
    </div>
  );
}
