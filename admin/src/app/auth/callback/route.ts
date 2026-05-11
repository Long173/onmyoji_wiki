import { NextResponse } from 'next/server';

import { createSupabaseServer } from '@/lib/supabase/server';

/** Handles the OTP redirect from the magic link email. Exchanges the code
 *  for a session, then routes to the dashboard (the middleware double-checks
 *  the email allowlist). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?reason=callback_failed`);
}
