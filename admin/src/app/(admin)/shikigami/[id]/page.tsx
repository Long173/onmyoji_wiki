import Link from 'next/link';
import { notFound } from 'next/navigation';

import { resolveStoredImage } from '@/lib/picker-utils';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import {
  MAIN_STAT_LABELS,
  SLOT_NUMBERS,
  type EffectRow,
  type Rarity,
  type ShikigamiRow,
  type ShikigamiStats,
  type Skill,
  type SoulRow,
  type StatTier,
} from '@/lib/types';

import { SkillTabs } from './skill-tabs';

export const dynamic = 'force-dynamic';

const RARITY_CHIP: Record<Rarity, string> = {
  SSR: 'bg-amber-500/20 text-amber-300',
  SP: 'bg-fuchsia-500/20 text-fuchsia-300',
  SR: 'bg-violet-500/20 text-violet-300',
  R: 'bg-sky-500/20 text-sky-300',
  N: 'bg-white/10 text-white/60',
};

const TIER_CHIP: Record<StatTier, string> = {
  '': 'bg-white/5 text-white/30',
  D: 'bg-zinc-500/20 text-zinc-300',
  C: 'bg-sky-500/20 text-sky-300',
  B: 'bg-emerald-500/20 text-emerald-300',
  A: 'bg-violet-500/20 text-violet-300',
  S: 'bg-amber-500/20 text-amber-300',
  SS: 'bg-rose-500/20 text-rose-300',
};

const STAT_LABELS: Record<keyof ShikigamiStats, string> = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  speed: 'SPD',
  crit_rate: 'Crit %',
  crit_dmg: 'Crit Dmg',
  accuracy: 'Acc',
  resist: 'Resist',
};

export default async function ShikigamiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('shikigami')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    return <div className="card p-6 text-red-300">Lỗi: {error.message}</div>;
  }
  if (!data) notFound();
  const s = data as ShikigamiRow;

  // Fetch referenced rows for display, parallel.
  const soulIds = s.recommended_souls ?? [];
  const counterIds = s.countered_by ?? [];
  const allEffectIds = Array.from(
    new Set(
      (s.skills ?? []).flatMap((sk: Skill) => [
        ...(sk.effects ?? []),
        // Include each alt form's effects so the bulk fetch covers them too.
        ...(sk.alt_forms ?? []).flatMap((alt) => alt.effects ?? []),
      ]),
    ),
  );

  const [soulsRes, countersRes, effectsRes] = await Promise.all([
    soulIds.length
      ? supabase
          .from('souls')
          .select('id,name_vi,name_en,kind,image')
          .in('id', soulIds)
      : Promise.resolve({ data: [] }),
    counterIds.length
      ? supabase
          .from('shikigami')
          .select('id,name_vi,name_en,rarity,image')
          .in('id', counterIds)
      : Promise.resolve({ data: [] }),
    allEffectIds.length
      ? supabase
          .from('effects')
          // `description` is needed for the hover-card preview rendered by
          // SkillTabs' EffectChip.
          .select('id,name,en_name,kind,image,description')
          .in('id', allEffectIds)
      : Promise.resolve({ data: [] }),
  ]);

  const soulsById = indexById(soulsRes.data as SoulRow[] | null);
  const countersById = indexById(countersRes.data as ShikigamiRow[] | null);
  const effectsById = indexById(effectsRes.data as EffectRow[] | null);

  // Restore selection order from source arrays.
  const recommendedSouls = soulIds
    .map((sid) => soulsById.get(sid))
    .filter((x): x is SoulRow => !!x);
  const counters = counterIds
    .map((sid) => countersById.get(sid))
    .filter((x): x is ShikigamiRow => !!x);

  const imageUrl = resolveStoredImage(s.image, true);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/shikigami"
          className="text-sm text-white/60 hover:text-white"
        >
          ← Danh sách Thức Thần
        </Link>
        <Link
          href={`/shikigami/${s.id}/edit`}
          className="btn-primary hover:btn-primary-hover"
        >
          ✎ Sửa
        </Link>
      </div>

      {/* ── Header ─────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[260px_1fr]">
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
                className={`rounded px-2 py-0.5 text-xs font-bold ${RARITY_CHIP[s.rarity]}`}
              >
                {s.rarity}
              </span>
              <span className="font-mono text-xs text-white/40">{s.id}</span>
            </div>
            <h1 className="text-3xl font-bold">
              {s.name_vi || s.name_en || s.id}
            </h1>
            {s.name_en && (
              <div className="text-sm italic text-white/60">{s.name_en}</div>
            )}
            {s.friendly_name?.length ? (
              <div className="flex flex-wrap gap-2">
                {s.friendly_name.map((fn) => (
                  <span
                    key={fn}
                    className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs"
                  >
                    {fn}
                  </span>
                ))}
              </div>
            ) : null}
            {s.description && (
              <p className="text-sm text-white/80">{s.description}</p>
            )}
            {s.source_url && (
              <a
                href={s.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-[var(--color-brand-gold)] hover:underline"
              >
                Nguồn ↗
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────── */}
      <Section title="Chỉ số">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(STAT_LABELS) as (keyof ShikigamiStats)[]).map((key) => {
            const v = s.stats?.[key];
            return (
              <div
                key={key}
                className="rounded-lg border border-white/10 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between text-xs uppercase text-white/50">
                  <span>{STAT_LABELS[key]}</span>
                  {v?.tier ? (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TIER_CHIP[v.tier as StatTier]}`}
                    >
                      {v.tier}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-xl font-bold">{v?.value ?? 0}</div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Skills ─────────────────────────── */}
      <Section title={`Kỹ năng (${s.skills?.length ?? 0})`}>
        {(s.skills?.length ?? 0) === 0 ? (
          <p className="text-sm text-white/40">Chưa có kỹ năng.</p>
        ) : (
          <SkillTabs skills={s.skills} effectsById={Object.fromEntries(effectsById)} />
        )}
      </Section>

      {/* ── Recommended souls ──────────────── */}
      <Section
        title={`Ngự hồn đề xuất (${recommendedSouls.length}${
          soulIds.length > recommendedSouls.length
            ? ` / ${soulIds.length} — có id không tồn tại`
            : ''
        })`}
      >
        <SlotMainsPanel slotMains={s.slot_mains} />
        {recommendedSouls.length === 0 ? (
          <p className="text-sm text-white/40">Chưa có gợi ý ngự hồn.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {recommendedSouls.map((soul) => (
              <Link
                key={soul.id}
                href={`/souls/${soul.id}`}
                className="group flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-2 transition-colors hover:border-[var(--color-brand-gold)]/40 hover:bg-white/[0.04]"
              >
                <Thumb path={soul.image} alt={soul.name_vi} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    {soul.name_vi || soul.name_en || soul.id}
                  </div>
                  {soul.name_vi && soul.name_en && (
                    <div className="truncate text-xs italic text-white/40">
                      {soul.name_en}
                    </div>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    soul.kind === 'boss'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {soul.kind === 'boss' ? 'BOSS' : 'NORMAL'}
                </span>
                <span className="text-xs text-white/30 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* ── Countered by ───────────────────── */}
      <Section title={`Khắc chế bởi (${counters.length})`}>
        {counters.length === 0 ? (
          <p className="text-sm text-white/40">
            Chưa khai báo Thức Thần khắc chế.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {counters.map((c) => (
              <Link
                key={c.id}
                href={`/shikigami/${c.id}`}
                className="group flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-2 transition-colors hover:border-[var(--color-brand-gold)]/40 hover:bg-white/[0.04]"
              >
                <Thumb path={c.image} alt={c.name_vi} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    {c.name_vi || c.name_en || c.id}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${RARITY_CHIP[c.rarity]}`}
                >
                  {c.rarity}
                </span>
                <span className="text-xs text-white/30 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* ── Lore ───────────────────────────── */}
      {s.lore && (
        <Section title="Truyện">
          <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">
            {s.lore}
          </p>
        </Section>
      )}
    </div>
  );
}

function indexById<T extends { id: string }>(
  rows: T[] | null,
): Map<string, T> {
  return new Map((rows ?? []).map((r) => [r.id, r]));
}

/** Read-only summary of the recommended main stats per soul slot.
 *  Renders nothing when no slot has any recommendation. */
function SlotMainsPanel({
  slotMains,
}: {
  slotMains?: ShikigamiRow['slot_mains'];
}) {
  if (!slotMains) return null;
  const hasAny = SLOT_NUMBERS.some(
    (slot) => (slotMains[slot] ?? []).length > 0,
  );
  if (!hasAny) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <span className="mb-2 block text-xs uppercase text-white/50">
        Main stat đề xuất
      </span>
      <div className="space-y-2">
        {SLOT_NUMBERS.map((slot) => {
          const stats = slotMains[slot] ?? [];
          if (stats.length === 0) return null;
          return (
            <div key={slot} className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-[var(--color-brand-gold)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-brand-gold)]">
                Slot {slot}
              </span>
              {stats.map((stat) => (
                <span
                  key={stat}
                  className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80"
                >
                  {MAIN_STAT_LABELS[stat] ?? stat}
                </span>
              ))}
            </div>
          );
        })}
      </div>
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
      <div className="space-y-4">{children}</div>
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
