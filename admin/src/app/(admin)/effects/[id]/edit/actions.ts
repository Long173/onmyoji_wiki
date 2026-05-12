'use server';

import { revalidatePath } from 'next/cache';

import { effectFormSchema, type EffectFormValues } from '@/lib/schemas';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function saveEffect(raw: unknown): Promise<SaveResult> {
  const parsed = effectFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors.map((e) => e.message).join(', '),
    };
  }
  const data: EffectFormValues = parsed.data;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from('effects').upsert(data);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/effects');
  revalidatePath(`/effects/${data.id}`);
  return { ok: true, id: data.id };
}

export async function deleteEffect(id: string): Promise<SaveResult> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from('effects').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/effects');
  return { ok: true, id };
}
