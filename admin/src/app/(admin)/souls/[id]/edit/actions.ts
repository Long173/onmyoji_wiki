'use server';

import { revalidatePath } from 'next/cache';

import { soulFormSchema, type SoulFormValues } from '@/lib/schemas';
import { slugify } from '@/lib/slugify';
import { uniqueSlug } from '@/lib/slug-server';
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

  if (!data.id) {
    const base = slugify(data.name_en || data.name_vi);
    if (!base) {
      return {
        ok: false,
        error: 'Cần tên (Anh hoặc Việt) để tự tạo ID.',
      };
    }
    try {
      data.id = await uniqueSlug('souls', base);
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

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
