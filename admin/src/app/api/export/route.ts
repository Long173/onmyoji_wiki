import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

import { isAdminEmail } from '@/lib/auth';
import {
  EFFECT_COLUMNS,
  effectToRow,
  SHIKIGAMI_COLUMNS,
  shikigamiToRow,
  SOUL_COLUMNS,
  soulToRow,
} from '@/lib/excel/columns';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';
import type { EffectRow, ShikigamiRow, SoulRow } from '@/lib/types';

// ExcelJS is Node-only; explicit runtime so Vercel doesn't try Edge.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/export → `.xlsx` with 3 sheets (Shikigami / Souls / Effects).
 *  Fetched live via service_role (RLS-bypass), preserves DB ordering
 *  (rarity/kind asc, sort_index asc). Filename includes today's date so the
 *  user knows which snapshot they're editing. */
export async function GET() {
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = createSupabaseAdmin();

  // Fetch all 3 tables in parallel.
  const [sk, so, ef] = await Promise.all([
    admin.from('shikigami').select('*').order('rarity').order('sort_index'),
    admin.from('souls').select('*').order('kind').order('sort_index'),
    admin.from('effects').select('*').order('kind').order('sort_index'),
  ]);

  if (sk.error || so.error || ef.error) {
    return NextResponse.json(
      { error: sk.error?.message ?? so.error?.message ?? ef.error?.message },
      { status: 500 },
    );
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Onmyoji Wiki Admin';
  wb.created = new Date();

  addSheet(
    wb.addWorksheet('Shikigami'),
    SHIKIGAMI_COLUMNS,
    (sk.data as ShikigamiRow[]).map(shikigamiToRow),
  );
  addSheet(
    wb.addWorksheet('Souls'),
    SOUL_COLUMNS,
    (so.data as SoulRow[]).map(soulToRow),
  );
  addSheet(
    wb.addWorksheet('Effects'),
    EFFECT_COLUMNS,
    (ef.data as EffectRow[]).map(effectToRow),
  );

  const buffer = await wb.xlsx.writeBuffer();

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="onmyoji-wiki-${today}.xlsx"`,
      // Don't cache — every download should be a fresh snapshot.
      'Cache-Control': 'no-store',
    },
  });
}

function addSheet(
  sheet: ExcelJS.Worksheet,
  columns: { header: string; key: string; width: number }[],
  rows: Record<string, unknown>[],
) {
  sheet.columns = columns;
  sheet.addRows(rows);
  // Style the header row so it stands out from data when the user opens.
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: 'middle' };
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1A1716' },
  };
  header.font = { bold: true, color: { argb: 'FFD4AF37' } };
  // Freeze header so it stays visible when scrolling 273 rows.
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}
