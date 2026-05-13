import Link from 'next/link';

import { SoulForm } from '@/components/soul-form';
import type { SoulRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Static route — see effects/new/page.tsx for why we can't re-export the edit page.
export default function SoulNewPage() {
  const initial: SoulRow = {
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
    is_finish: false,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/souls"
          className="text-sm text-white/60 hover:text-white"
        >
          ← Danh sách
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Thêm Ngự hồn</h1>
      </div>
      <SoulForm initial={initial} isNew />
    </div>
  );
}
