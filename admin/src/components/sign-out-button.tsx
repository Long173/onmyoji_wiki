'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createSupabaseBrowser } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      onClick={async () => {
        setBusy(true);
        await createSupabaseBrowser().auth.signOut();
        router.push('/login');
        router.refresh();
      }}
      disabled={busy}
      className="rounded border border-white/20 px-3 py-1 hover:bg-white/5 disabled:opacity-50"
    >
      {busy ? '…' : 'Đăng xuất'}
    </button>
  );
}
