/** Build version chip — server-rendered from Vercel's git env vars.
 *
 *  Vercel auto-injects `VERCEL_GIT_*` at build time (see
 *  https://vercel.com/docs/projects/environment-variables/system-environment-variables).
 *  Local `next dev` won't have these, so we fall back to a "local" pill. */
export function VersionBadge() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const repo = process.env.VERCEL_GIT_REPO_SLUG;
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE?.split('\n')[0];
  const branch = process.env.VERCEL_GIT_COMMIT_REF;

  if (!sha) {
    return (
      <span
        className="rounded border border-white/10 px-2 py-1 font-mono text-xs text-white/40"
        title="Local dev — no Vercel env vars"
      >
        local
      </span>
    );
  }

  const short = sha.slice(0, 7);
  const url =
    owner && repo
      ? `https://github.com/${owner}/${repo}/commit/${sha}`
      : null;
  const tooltip = message
    ? `${short} · ${branch ?? 'main'}\n\n${message}`
    : `${short} · ${branch ?? 'main'}`;

  const chip = (
    <span className="inline-flex items-center gap-1.5 rounded border border-white/10 px-2 py-1 font-mono text-xs text-white/60 transition-colors hover:border-[var(--color-brand-gold)]/40 hover:text-white">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />v {short}
      {branch && branch !== 'main' && (
        <span className="rounded bg-white/10 px-1 text-[10px] uppercase">
          {branch}
        </span>
      )}
    </span>
  );

  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltip}
      className="block"
    >
      {chip}
    </a>
  ) : (
    <span title={tooltip}>{chip}</span>
  );
}
