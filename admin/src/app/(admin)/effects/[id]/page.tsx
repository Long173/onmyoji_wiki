import Link from 'next/link';
import { notFound } from 'next/navigation';

import { resolveStoredImage } from '@/lib/picker-utils';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { EffectRow, Rarity, ShikigamiRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

const KIND_CHIP: Record<string, { label: string; cls: string }> = {
  buff: { label: 'BUFF', cls: 'bg-emerald-500/20 text-emerald-300' },
  debuff: { label: 'DEBUFF', cls: 'bg-red-500/20 text-red-300' },
  other: { label: 'KHÁC', cls: 'bg-white/10 text-white/60' },
};

const RARITY_CHIP: Record<Rarity, string> = {
  SSR: 'bg-amber-500/20 text-amber-300',
  SP: 'bg-fuchsia-500/20 text-fuchsia-300',
  SR: 'bg-violet-500/20 text-violet-300',
  R: 'bg-sky-500/20 text-sky-300',
  N: 'bg-white/10 text-white/60',
};

export default async function EffectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('effects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    return <div className="card p-6 text-red-300">Lỗi: {error.message}</div>;
  }
  if (!data) notFound();
  const e = data as EffectRow;

  // Reverse lookup via JSONB containment (`@>`): shikigami whose skills
  // tag this effect id.
  const { data: refData } = await supabase
    .from('shikigami')
    .select('id,name_vi,name_en,rarity,image')
    .contains('skills', [{ effects: [id] }])
    .order('rarity')
    .order('sort_index');
  const referencedBy = (refData ?? []) as ShikigamiRow[];

  const imageUrl = resolveStoredImage(e.image, true);
  const kind = KIND_CHIP[e.kind] ?? KIND_CHIP.other;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/effects"
          className="text-sm text-white/60 hover:text-white"
        >
          ← Danh sách Hiệu ứng
        </Link>
        <Link
          href={`/effects/${e.id}/edit`}
          className="btn-primary hover:btn-primary-hover"
        >
          ✎ Sửa
        </Link>
      </div>

      <section className="card overflow-hidden">
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[160px_1fr]">
          <div className="aspect-square w-full overflow-hidden rounded-lg bg-black/30">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={e.name || e.id}
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
                className={`rounded px-2 py-0.5 text-xs font-bold ${kind.cls}`}
              >
                {kind.label}
              </span>
              <span className="font-mono text-xs text-white/40">{e.id}</span>
            </div>
            <h1 className="text-3xl font-bold">
              {e.name || e.en_name || e.id}
            </h1>
            {e.en_name && (
              <div className="text-sm italic text-white/60">{e.en_name}</div>
            )}
            {e.description && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">
                {e.description}
              </p>
            )}
          </div>
        </div>
      </section>

      <Section title={`Thức Thần dùng hiệu ứng này (${referencedBy.length})`}>
        {referencedBy.length === 0 ? (
          <p className="text-sm text-white/40">
            Chưa có Thức Thần nào tag hiệu ứng này trong skill.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {referencedBy.map((s) => (
              <Link
                key={s.id}
                href={`/shikigami/${s.id}`}
                className="group flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-2 transition-colors hover:border-[var(--color-brand-gold)]/40 hover:bg-white/[0.04]"
              >
                <Thumb path={s.image} alt={s.name_vi} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    {s.name_vi || s.name_en || s.id}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${RARITY_CHIP[s.rarity]}`}
                >
                  {s.rarity}
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
  const url = resolveStoredImage(path, true);
  return (
    <span className="block h-10 w-10 shrink-0 overflow-hidden rounded bg-black/40">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      ) : null}
    </span>
  );
}
