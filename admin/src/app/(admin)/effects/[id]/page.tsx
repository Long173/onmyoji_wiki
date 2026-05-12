import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EffectForm } from '@/components/effect-form';
import type { ShikigamiOption } from '@/components/shikigami-picker-field';
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

  const supabase = createSupabaseAdmin();

  let initial: EffectRow;
  let referencedBy: ShikigamiOption[] = [];

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

    // Reverse lookup: shikigami whose `skills` JSONB contains a skill that
    // tags this effect id. Uses Postgres JSONB containment (`@>`) which
    // matches recursively into array elements + object keys.
    const { data: refData } = await supabase
      .from('shikigami')
      .select('id,name_vi,name_en,name_jp,rarity,image')
      .contains('skills', [{ effects: [id] }])
      .order('rarity')
      .order('sort_index');
    referencedBy = (refData ?? []) as ShikigamiOption[];
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
      <EffectForm
        initial={initial}
        isNew={isNew}
        referencedBy={referencedBy}
      />
    </div>
  );
}
