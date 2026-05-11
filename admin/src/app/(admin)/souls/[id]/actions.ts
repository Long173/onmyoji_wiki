'use server';

import { revalidatePath } from 'next/cache';

import { soulFormSchema, type SoulFormValues } from '@/lib/schemas';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function saveSoul(raw: unknown): Promise<SaveResult> {
  const parsed = soulFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors.map((e) => e.message).join(', '),
    };
  }
  const data: SoulFormValues = parsed.data;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from('souls').upsert(data);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/souls');
  revalidatePath(`/souls/${data.id}`);
  return { ok: true, id: data.id };
}

export async function deleteSoul(id: string): Promise<SaveResult> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from('souls').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/souls');
  return { ok: true, id };
}
