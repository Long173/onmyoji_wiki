import 'server-only';

import { createSupabaseAdmin } from './supabase/admin';

/**
 * Given a base slug, return the smallest free variant by appending `_2`,
 * `_3`, ... until a row with that id does not exist on `table`. Used by save
 * actions when auto-generating an id for a brand-new record.
 *
 * Throws after 100 attempts to prevent runaway loops if the table is broken.
 *
 * @param table  PostgREST table name (e.g. 'shikigami', 'souls', 'effects')
 * @param base   The slug to check first; must already be a valid SLUG.
 */
export async function uniqueSlug(
  table: 'shikigami' | 'souls' | 'effects',
  base: string,
): Promise<string> {
  if (!base) throw new Error('uniqueSlug: base is empty');

  const supabase = createSupabaseAdmin();

  for (let suffix = 0; suffix < 100; suffix++) {
    const candidate = suffix === 0 ? base : `${base}_${suffix + 1}`;
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq('id', candidate)
      .maybeSingle();
    if (error) throw new Error(`uniqueSlug: ${error.message}`);
    if (!data) return candidate;
  }

  throw new Error(`uniqueSlug: could not find free variant for "${base}"`);
}
