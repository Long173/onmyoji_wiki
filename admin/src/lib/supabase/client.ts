'use client';

import { createBrowserClient } from '@supabase/ssr';

/** Browser-side Supabase client. Uses the anon (publishable) key; RLS
 *  restricts what the user can do based on their session cookie. */
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
