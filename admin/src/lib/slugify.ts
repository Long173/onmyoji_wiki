/**
 * Convert a display name into a snake_case slug suitable for our SLUG schema
 * (`[a-z0-9_]+`). Strips Vietnamese diacritics via NFD decomposition and
 * special-cases `đ → d` (which NFD doesn't decompose).
 *
 * Examples:
 *   "Tử Kim Thần"   → "tu_kim_than"
 *   "Attack Up!"    → "attack_up"
 *   "Đại Thiên Cẩu" → "dai_thien_cau"
 *
 * Pure function, safe for both client and server use. Returns "" for input
 * that is empty or contains no valid slug characters.
 */
export function slugify(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritical marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}
