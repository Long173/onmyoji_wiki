import Link from 'next/link';

import { resolveStoredImage } from '@/lib/picker-utils';
import type { EffectRow, Skill } from '@/lib/types';

const EFFECT_KIND_CHIP: Record<string, string> = {
  buff: 'bg-emerald-500/20 text-emerald-300',
  debuff: 'bg-red-500/20 text-red-300',
  other: 'bg-white/10 text-white/60',
};

const EFFECT_KIND_LABEL: Record<string, string> = {
  buff: 'BUFF',
  debuff: 'DEBUFF',
  other: 'KHÁC',
};

/** Renders one block per skill: icon + name + cost on top, the level-1
 *  description as the base paragraph, level 2+ upgrades stacked beneath,
 *  and any tagged effects as clickable chips. Server component — no JS
 *  state needed since everything is shown at once. */
export function SkillTabs({
  skills,
  effectsById,
}: {
  skills: Skill[];
  effectsById: Record<string, EffectRow>;
}) {
  return (
    <div className="space-y-4">
      {skills.map((skill, i) => (
        <SkillBlock
          key={`${skill.name}-${i}`}
          skill={skill}
          index={i}
          effectsById={effectsById}
        />
      ))}
    </div>
  );
}

function SkillBlock({
  skill,
  index,
  effectsById,
}: {
  skill: Skill;
  index: number;
  effectsById: Record<string, EffectRow>;
}) {
  // Level 1 is the "base" description shown unlabelled at the top — that's
  // the version the player starts with. Levels 2+ are upgrades, each shown
  // with their "Lv2"/"Lv3"… badge. If the data lacks a level-1 entry we
  // fall back to the plain `skill.description` field (legacy data).
  const baseDescription =
    skill.levels?.find((l) => l.level === 1)?.description ||
    skill.description ||
    '';
  const upgrades = (skill.levels ?? [])
    .filter((l) => l.level > 1)
    .sort((a, b) => a.level - b.level);

  const iconUrl = resolveStoredImage(skill.image ?? '');

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="block h-10 w-10 shrink-0 overflow-hidden rounded bg-black/40">
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconUrl}
              alt={skill.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-white/40">
              {index + 1}
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{skill.name || `Skill ${index + 1}`}</div>
          {typeof skill.cost === 'number' && skill.cost > 0 && (
            <div className="text-xs text-white/40">Cost: {skill.cost}</div>
          )}
        </div>
      </div>

      {baseDescription ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">
          {baseDescription}
        </p>
      ) : (
        <p className="text-sm italic text-white/40">Chưa có mô tả.</p>
      )}

      {upgrades.length > 0 && (
        <div className="mt-3 space-y-2">
          {upgrades.map((lv) => (
            <div
              key={lv.level}
              className="flex gap-3 rounded-md border border-white/10 bg-black/15 p-2 pl-3"
            >
              <span className="mt-0.5 shrink-0 self-start rounded bg-[var(--color-brand-gold)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-brand-gold)]">
                Lv{lv.level}
              </span>
              <p className="flex-1 whitespace-pre-line text-sm leading-relaxed text-white/80">
                {lv.description || (
                  <span className="italic text-white/30">
                    Chưa có mô tả cho cấp này.
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {skill.effects?.length ? (
        <div className="mt-3 border-t border-white/5 pt-3">
          <span className="mb-2 block text-[10px] uppercase text-white/40">
            Hiệu ứng tham chiếu
          </span>
          <div className="flex flex-wrap gap-2">
            {skill.effects.map((eid) => {
              const e = effectsById[eid];
              if (!e) {
                return (
                  <span
                    key={eid}
                    className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-300"
                    title="Hiệu ứng id không tồn tại"
                  >
                    {eid} ⚠
                  </span>
                );
              }
              return <EffectChip key={eid} effect={e} />;
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Chip for one referenced effect. Always shows the effect's image
 *  (falls back to a kind-coloured dot if no image), and reveals a hover
 *  card with the kind label + full description on pointer-hover. The chip
 *  itself remains a Link to the effect detail page, so click still works
 *  on touch devices where :hover doesn't apply. */
function EffectChip({ effect }: { effect: EffectRow }) {
  const iconUrl = resolveStoredImage(effect.image ?? '');
  const kindClass =
    EFFECT_KIND_CHIP[effect.kind] ?? EFFECT_KIND_CHIP.other;
  const displayName = effect.name || effect.en_name || effect.id;

  return (
    <div className="group relative inline-block">
      <Link
        href={`/effects/${effect.id}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-xs transition-colors hover:border-[var(--color-brand-gold)]/40 hover:bg-white/[0.08]"
      >
        <EffectIcon effect={effect} url={iconUrl} size={20} />
        <span>{displayName}</span>
      </Link>

      {/* Hover card. The outer wrapper has `pb-2` (visual 8px gap above the
       *  chip) so the hit-area extends down to touch the chip's top edge —
       *  this prevents losing :group-hover while the cursor traverses what
       *  would otherwise be a dead-zone gap, killing flicker. Inner div
       *  holds the actual styled card. z-50 keeps it above sibling cards. */}
      <div
        role="tooltip"
        className="invisible absolute bottom-full left-0 z-50 pb-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
      >
        <div className="w-64 rounded-lg border border-white/10 bg-[var(--color-ink)] p-3 shadow-2xl">
          <div className="mb-2 flex items-center gap-2">
            <EffectIcon effect={effect} url={iconUrl} size={32} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {displayName}
              </div>
              {effect.en_name &&
                effect.name &&
                effect.name !== effect.en_name && (
                  <div className="truncate text-[10px] italic text-white/40">
                    {effect.en_name}
                  </div>
                )}
            </div>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${kindClass}`}
            >
              {EFFECT_KIND_LABEL[effect.kind] ?? effect.kind.toUpperCase()}
            </span>
          </div>
          {effect.description ? (
            <p className="whitespace-pre-line text-xs leading-relaxed text-white/70">
              {effect.description}
            </p>
          ) : (
            <p className="text-xs italic text-white/30">(chưa có mô tả)</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EffectIcon({
  effect,
  url,
  size,
}: {
  effect: EffectRow;
  url: string;
  size: number;
}) {
  if (url) {
    return (
      <span
        className="block shrink-0 overflow-hidden rounded-full bg-black/40"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={effect.name || effect.en_name || effect.id}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }
  // Fallback when the effect has no image: a kind-coloured dot. Keeps the
  // layout consistent so chips don't jump width when icon is missing.
  const dotClass =
    EFFECT_KIND_CHIP[effect.kind] ?? EFFECT_KIND_CHIP.other;
  return (
    <span
      className={`block shrink-0 rounded-full ${dotClass}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
