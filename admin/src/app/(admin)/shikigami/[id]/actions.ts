'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseAdmin } from '@/lib/supabase/admin';
import {
  shikigamiFormSchema,
  type ShikigamiFormValues,
} from '@/lib/schemas';

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function saveShikigami(
  raw: unknown,
): Promise<SaveResult> {
  const parsed = shikigamiFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors.map((e) => e.message).join(', '),
    };
  }
  const data: ShikigamiFormValues = parsed.data;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('shikigami')
    .upsert({
      ...data,
      // `skills` cost is optional in TS; Postgres jsonb accepts the shape as-is.
      skills: data.skills,
      stats: data.stats,
    });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/shikigami');
  revalidatePath(`/shikigami/${data.id}`);
  return { ok: true, id: data.id };
}

export async function deleteShikigami(id: string): Promise<SaveResult> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from('shikigami').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/shikigami');
  return { ok: true, id };
}
