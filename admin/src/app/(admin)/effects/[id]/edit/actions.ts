'use server';

import { revalidatePath } from 'next/cache';

import { effectFormSchema, type EffectFormValues } from '@/lib/schemas';
import { slugify } from '@/lib/slugify';
import { uniqueSlug } from '@/lib/slug-server';
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

  if (!data.id) {
    // Effects use `name` (vi) and `en_name` — slugify English first.
    const base = slugify(data.en_name || data.name);
    if (!base) {
      return {
        ok: false,
        error: 'Cần tên (Anh hoặc Việt) để tự tạo ID.',
      };
    }
    try {
      data.id = await uniqueSlug('effects', base);
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

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
