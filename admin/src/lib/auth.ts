/** Returns the allowlist of admin emails parsed from env. Empty list means
 *  no-one can access — fail closed. */
export function adminEmailAllowlist(): readonly string[] {
  return (process.env.ADMIN_EMAIL_ALLOWLIST ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailAllowlist().includes(email.trim().toLowerCase());
}
