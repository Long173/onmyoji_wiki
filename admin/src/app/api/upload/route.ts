import { NextResponse } from 'next/server';

import { isAdminEmail } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';

const BUCKET = 'assets';
const ALLOWED_KINDS = new Set(['shikigami', 'souls', 'effects', 'skills']);
const ALLOWED_RARITIES = new Set(['ssr', 'sr', 'sp', 'r', 'n']);

/** POST /api/upload — multipart form-data:
 *    file:    Blob (required)
 *    kind:    'shikigami' | 'souls' | 'effects' | 'skills' (required)
 *    id:      record id, used as filename (required)
 *    rarity:  required when kind === 'shikigami' (lowercase)
 *
 *  Writes to `<bucket>/<kind>/<rarity?>/<id>.<ext>` and returns the
 *  bucket-relative path the JSON `image` column should store. */
export async function POST(request: Request) {
  // 1) Auth: ensure caller is an allowlisted admin.
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // 2) Parse multipart.
  const form = await request.formData();
  const file = form.get('file');
  const kind = String(form.get('kind') ?? '').trim();
  const id = String(form.get('id') ?? '').trim();
  const rarity = String(form.get('rarity') ?? '').trim().toLowerCase();

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'missing file' }, { status: 400 });
  }
  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json(
      { error: `invalid kind: ${kind}` },
      { status: 400 },
    );
  }
  if (!id || !/^[a-z0-9_]+$/.test(id)) {
    return NextResponse.json(
      { error: 'invalid id (must be snake_case)' },
      { status: 400 },
    );
  }
  if (kind === 'shikigami' && !ALLOWED_RARITIES.has(rarity)) {
    return NextResponse.json(
      { error: 'shikigami requires rarity' },
      { status: 400 },
    );
  }

  // 3) Build bucket path.
  const contentType =
    file.type && file.type !== 'application/octet-stream'
      ? file.type
      : 'image/webp';
  const ext = contentType.split('/')[1] ?? 'webp';
  const segments =
    kind === 'shikigami' ? [kind, rarity, `${id}.${ext}`] : [kind, `${id}.${ext}`];
  const bucketPath = segments.join('/');

  // 4) Upload via service_role.
  const admin = createSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from(BUCKET).upload(bucketPath, buffer, {
    upsert: true,
    contentType,
    cacheControl: '31536000',
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ path: bucketPath });
}
