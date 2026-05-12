import Link from 'next/link';
import { notFound } from 'next/navigation';

import { resolveStoredImage } from '@/lib/picker-utils';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { Rarity, ShikigamiRow, SoulRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

const RARITY_CHIP: Record<Rarity, string> = {
  SSR: 'bg-amber-500/20 text-amber-300',
  SP: 'bg-fuchsia-500/20 text-fuchsia-300',
  SR: 'bg-violet-500/20 text-violet-300',
  R: 'bg-sky-500/20 text-sky-300',
  N: 'bg-white/10 text-white/60',
};

export default async function SoulDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('souls')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    return <div className="card p-6 text-red-300">Lỗi: {error.message}</div>;
  }
  if (!data) notFound();
  const s = data as SoulRow;

  // Reverse lookup: shikigami that recommend this soul.
  const { data: recRows } = await supabase
    .from('shikigami')
    .select('id,name_vi,name_en,rarity,image')
    .contains('recommended_souls', [id])
    .order('rarity')
    .order('sort_index');
  const recommendedBy = (recRows ?? []) as ShikigamiRow[];

  const imageUrl = resolveStoredImage(s.image);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/souls"
          className="text-sm text-white/60 hover:text-white"
        >
          ← Danh sách Ngự hồn
        </Link>
        <Link
          href={`/souls/${s.id}/edit`}
          className="btn-primary hover:btn-primary-hover"
        >
          ✎ Sửa
        </Link>
      </div>

      {/* ── Header ────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[200px_1fr]">
          <div className="aspect-square w-full overflow-hidden rounded-lg bg-black/30">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={s.name_vi || s.id}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white/30">
                (no image)
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold ${
                  s.kind === 'boss'
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {s.kind === 'boss' ? 'NGỰ BOSS' : 'NGỰ THƯỜNG'}
              </span>
              <span className="font-mono text-xs text-white/40">{s.id}</span>
            </div>
            <h1 className="text-3xl font-bold">
              {s.name_vi || s.name_en || s.id}
            </h1>
            <div className="text-sm italic text-white/60">{s.name_en}</div>
          </div>
        </div>
      </section>

      {/* ── Effects per piece-count ────────── */}
      <Section title="Hiệu ứng theo mảnh">
        {(s.effects ?? []).length === 0 ? (
          <p className="text-sm text-white/40">Chưa có hiệu ứng nào.</p>
        ) : (
          <div className="space-y-3">
            {s.effects.map((e, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/10 bg-black/20 p-4"
              >
                <div className="mb-2 inline-flex items-center gap-2 rounded bg-[var(--color-brand-gold)]/20 px-2 py-0.5 text-xs font-semibold text-[var(--color-brand-gold)]">
                  {e.pieces} mảnh
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">
                  {e.description || (
                    <span className="text-white/40">Chưa có mô tả.</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Recommended by shikigami ───────── */}
      <Section title={`Thức Thần đề xuất ngự hồn này (${recommendedBy.length})`}>
        {recommendedBy.length === 0 ? (
          <p className="text-sm text-white/40">
            Chưa có Thức Thần nào tag ngự hồn này vào recommended_souls.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {recommendedBy.map((sk) => (
              <Link
                key={sk.id}
                href={`/shikigami/${sk.id}`}
                className="group flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-2 transition-colors hover:border-[var(--color-brand-gold)]/40 hover:bg-white/[0.04]"
              >
                <Thumb path={sk.image} alt={sk.name_vi} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    {sk.name_vi || sk.name_en || sk.id}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${RARITY_CHIP[sk.rarity]}`}
                >
                  {sk.rarity}
                </span>
                <span className="text-xs text-white/30 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-[var(--color-brand-gold)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Thumb({ path, alt }: { path: string; alt: string }) {
  const url = resolveStoredImage(path);
  return (
    <span className="block h-10 w-10 shrink-0 overflow-hidden rounded bg-black/40">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      ) : null}
    </span>
  );
}
