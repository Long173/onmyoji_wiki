import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Cookie-backed Supabase client for Server Components, Server Actions, and
 *  Route Handlers. Reads the user's session from cookies — use this anywhere
 *  you need "the currently logged-in user" on the server. */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // `set` throws in pure Server Components — middleware will
            // refresh the session on the next request, which is fine.
          }
        },
      } satisfies CookieMethodsServer,
    },
  );
}
