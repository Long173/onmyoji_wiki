import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

import { isAdminEmail } from '@/lib/auth';
import {
  EFFECT_COLUMNS,
  rowToEffect,
  rowToShikigami,
  rowToSoul,
  SHIKIGAMI_COLUMNS,
  SOUL_COLUMNS,
} from '@/lib/excel/columns';
import {
  effectFormSchema,
  shikigamiFormSchema,
  soulFormSchema,
} from '@/lib/schemas';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SheetResult {
  upserted: number;
  errors: { excelRow: number; id: string; error: string }[];
}

interface ImportResult {
  shikigami: SheetResult;
  souls: SheetResult;
  effects: SheetResult;
}

/** POST /api/import (multipart form-data with `file`) — accepts the
 *  xlsx produced by /api/export, parses each sheet, validates rows via the
 *  existing Zod form schemas, and upserts in bulk via service_role.
 *
 *  Errors are collected per-sheet per-row so a single malformed row doesn't
 *  abort the whole import. Empty `id` rows are silently skipped (Excel
 *  often appends blank trailing rows). */
export async function POST(request: Request) {
  // Auth.
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Parse multipart.
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'missing file' }, { status: 400 });
  }

  // Load workbook.
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch (e) {
    return NextResponse.json(
      {
        error: `Không đọc được file .xlsx: ${
          e instanceof Error ? e.message : 'unknown'
        }`,
      },
      { status: 400 },
    );
  }

  const result: ImportResult = {
    shikigami: { upserted: 0, errors: [] },
    souls: { upserted: 0, errors: [] },
    effects: { upserted: 0, errors: [] },
  };

  const admin = createSupabaseAdmin();

  // ── Shikigami ──
  const skSheet = wb.getWorksheet('Shikigami');
  if (skSheet) {
    const rows = readSheet(skSheet, SHIKIGAMI_COLUMNS.map((c) => c.key));
    const payload: Record<string, unknown>[] = [];
    rows.forEach(({ excelRow, raw }) => {
      if (!String(raw.id ?? '').trim()) return; // skip blank rows
      try {
        const mapped = rowToShikigami(raw);
        const parsed = shikigamiFormSchema.parse(mapped);
        payload.push(parsed);
      } catch (e) {
        result.shikigami.errors.push({
          excelRow,
          id: String(raw.id ?? ''),
          error: e instanceof Error ? e.message : String(e),
        });
      }
    });
    if (payload.length > 0) {
      const { error } = await admin.from('shikigami').upsert(payload);
      if (error) {
        result.shikigami.errors.push({
          excelRow: 0,
          id: '(batch)',
          error: error.message,
        });
      } else {
        result.shikigami.upserted = payload.length;
      }
    }
  }

  // ── Souls ──
  const soSheet = wb.getWorksheet('Souls');
  if (soSheet) {
    const rows = readSheet(soSheet, SOUL_COLUMNS.map((c) => c.key));
    const payload: Record<string, unknown>[] = [];
    rows.forEach(({ excelRow, raw }) => {
      if (!String(raw.id ?? '').trim()) return;
      try {
        const mapped = rowToSoul(raw);
        const parsed = soulFormSchema.parse(mapped);
        payload.push(parsed);
      } catch (e) {
        result.souls.errors.push({
          excelRow,
          id: String(raw.id ?? ''),
          error: e instanceof Error ? e.message : String(e),
        });
      }
    });
    if (payload.length > 0) {
      const { error } = await admin.from('souls').upsert(payload);
      if (error) {
        result.souls.errors.push({
          excelRow: 0,
          id: '(batch)',
          error: error.message,
        });
      } else {
        result.souls.upserted = payload.length;
      }
    }
  }

  // ── Effects ──
  const efSheet = wb.getWorksheet('Effects');
  if (efSheet) {
    const rows = readSheet(efSheet, EFFECT_COLUMNS.map((c) => c.key));
    const payload: Record<string, unknown>[] = [];
    rows.forEach(({ excelRow, raw }) => {
      if (!String(raw.id ?? '').trim()) return;
      try {
        const mapped = rowToEffect(raw);
        const parsed = effectFormSchema.parse(mapped);
        payload.push(parsed);
      } catch (e) {
        result.effects.errors.push({
          excelRow,
          id: String(raw.id ?? ''),
          error: e instanceof Error ? e.message : String(e),
        });
      }
    });
    if (payload.length > 0) {
      const { error } = await admin.from('effects').upsert(payload);
      if (error) {
        result.effects.errors.push({
          excelRow: 0,
          id: '(batch)',
          error: error.message,
        });
      } else {
        result.effects.upserted = payload.length;
      }
    }
  }

  return NextResponse.json(result);
}

/** Read every non-empty row from an Excel sheet into a list of
 *  `{excelRow, raw}` pairs keyed by the header order from our column spec.
 *  `excelRow` is the 1-based row index in the file (so error messages map
 *  back to what the user sees). */
function readSheet(
  sheet: ExcelJS.Worksheet,
  keys: string[],
): { excelRow: number; raw: Record<string, unknown> }[] {
  // Build header→column-index map from row 1 so column reordering by the
  // user doesn't break import (as long as headers match).
  const headerRow = sheet.getRow(1);
  const colByKey = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const header = String(cell.value ?? '').trim();
    if (header) colByKey.set(header, colNumber);
  });

  const out: { excelRow: number; raw: Record<string, unknown> }[] = [];
  // Sheet rows: 1 is the header, 2..N are data.
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const raw: Record<string, unknown> = {};
    for (const key of keys) {
      const col = colByKey.get(key);
      if (col) raw[key] = row.getCell(col).value;
    }
    out.push({ excelRow: rowNumber, raw });
  });
  return out;
}
