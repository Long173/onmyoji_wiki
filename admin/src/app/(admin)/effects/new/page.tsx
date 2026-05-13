import Link from 'next/link';

import { EffectForm } from '@/components/effect-form';
import type { EffectRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Static route — has no `[id]` URL slot. We can't re-export `[id]/edit/page`
// here (params would be empty, not `{ id: 'new' }`), so build the empty record
// inline and render the form directly.
export default function EffectNewPage() {
  const initial: EffectRow = {
    id: '',
    name: '',
    en_name: '',
    kind: 'buff',
    description: '',
    image: '',
    sort_index: 0,
    is_finish: false,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/effects"
          className="text-sm text-white/60 hover:text-white"
        >
          ← Danh sách
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Thêm Hiệu ứng</h1>
      </div>
      <EffectForm initial={initial} isNew />
    </div>
  );
}
