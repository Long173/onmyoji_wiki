import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { isAdminEmail } from './lib/auth';

const PUBLIC_PATHS = new Set(['/login', '/auth/callback']);

/** Auth gate. Two-step check:
 *   1. User must have a Supabase session.
 *   2. Session email must be in `ADMIN_EMAIL_ALLOWLIST`.
 *  Failing either redirects to /login. */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options);
          }
        },
      } satisfies CookieMethodsServer,
    },
  );

  // Always call getUser() to refresh expired tokens (recommended by Supabase
  // docs for the SSR helper).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.has(path) || path.startsWith('/auth/');

  if (isPublic) return response;

  if (!user || !isAdminEmail(user.email)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('reason', user ? 'forbidden' : 'unauthenticated');
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match every route except Next.js internals + static files.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
