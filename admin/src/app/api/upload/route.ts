import { NextResponse } from 'next/server';
import sharp from 'sharp';

import { isAdminEmail } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';

// sharp is a Node-only native module — must opt out of Edge runtime.
export const runtime = 'nodejs';

const BUCKET = 'assets';
const ALLOWED_KINDS = new Set(['shikigami', 'souls', 'effects', 'skills']);
const ALLOWED_RARITIES = new Set(['ssr', 'sr', 'sp', 'r', 'n']);
const WEBP_QUALITY = 80;
// 1-hour CDN TTL. Long enough that the dominant "no changes" case still
// benefits from caching, short enough that replacing a file in Supabase
// Storage dashboard (which keeps the same URL) propagates within an hour
// without manual purge. Previously 31536000 (1 year) which made stale
// images effectively permanent until manual purge.
const CACHE_CONTROL_SECONDS = '3600';

/** POST /api/upload — multipart form-data:
 *    file:    Blob (required)
 *    kind:    'shikigami' | 'souls' | 'effects' | 'skills' (required)
 *    id:      record id, used as filename (required)
 *    rarity:  required when kind === 'shikigami' (lowercase)
 *    oldPath: optional bucket path of the previous image; deleted after the
 *             new upload succeeds if it differs from the new path
 *
 *  Pipeline:
 *    1. Authenticate caller against the email allowlist.
 *    2. Re-encode the input to WebP via sharp (40-60% smaller than PNG).
 *    3. Upload to `assets/<kind>/<rarity?>/<id>.webp` with upsert=true.
 *    4. If oldPath differs from the new path, delete the orphan.
 *
 *  Returns `{ path: '<kind>/.../<id>.webp' }` — the bucket-relative path the
 *  JSON `image` column should store. */
export async function POST(request: Request) {
  // 1) Auth.
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
  const oldPath = normaliseBucketPath(String(form.get('oldPath') ?? '').trim());

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

  // 3) Convert to WebP. sharp handles PNG/JPG/AVIF/WEBP/HEIF input — for
  //    SVG/PDF/etc. we surface a clear error rather than uploading garbage.
  let webpBuffer: Buffer;
  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    webpBuffer = await sharp(inputBuffer)
      .rotate() // honour EXIF orientation
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
  } catch (e) {
    return NextResponse.json(
      {
        error: `Không decode được ảnh: ${
          e instanceof Error ? e.message : 'unknown error'
        }`,
      },
      { status: 400 },
    );
  }

  // 4) Build bucket path. Always .webp regardless of source.
  const segments =
    kind === 'shikigami'
      ? [kind, rarity, `${id}.webp`]
      : [kind, `${id}.webp`];
  const bucketPath = segments.join('/');

  // 5) Upload (upsert = overwrite same-path siblings).
  const admin = createSupabaseAdmin();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(bucketPath, webpBuffer, {
      upsert: true,
      contentType: 'image/webp',
      cacheControl: CACHE_CONTROL_SECONDS,
    });
  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 },
    );
  }

  // 6) Best-effort cleanup of the previous file. If it was the same path
  //    we just upserted to, skip — upload already overwrote in place.
  let cleaned: string | null = null;
  if (oldPath && oldPath !== bucketPath) {
    const { error: removeError } = await admin.storage
      .from(BUCKET)
      .remove([oldPath]);
    if (!removeError) {
      cleaned = oldPath;
    }
    // Don't fail the request just because cleanup couldn't run — the new
    // upload is already live.
  }

  return NextResponse.json({
    path: bucketPath,
    size: webpBuffer.byteLength,
    cleaned,
  });
}

/** Normalise either a full Supabase Storage URL or a legacy `assets/...`
 *  path down to the bucket-relative key (e.g. `shikigami/ssr/foo.webp`).
 *  Returns empty string if the input doesn't look like our bucket. */
function normaliseBucketPath(input: string): string {
  if (!input) return '';
  // Full URL → strip the public CDN prefix.
  const urlMatch = input.match(
    /\/storage\/v1\/object\/(?:public\/)?assets\/(.+)$/,
  );
  if (urlMatch) return urlMatch[1];
  // Legacy `assets/images/...` from before the migration.
  return input.replace(/^(assets\/images\/|assets\/)/, '');
}
