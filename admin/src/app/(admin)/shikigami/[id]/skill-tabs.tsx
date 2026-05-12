'use client';

import Link from 'next/link';
import { useState } from 'react';

import { resolveStoredImage } from '@/lib/picker-utils';
import type { EffectRow, Skill } from '@/lib/types';

const EFFECT_KIND_CHIP: Record<string, string> = {
  buff: 'bg-emerald-500/20 text-emerald-300',
  debuff: 'bg-red-500/20 text-red-300',
  other: 'bg-white/10 text-white/60',
};

/** Renders one accordion-ish block per skill: icon + name + cost on top, the
 *  Lv1-Lv5 description as a tab strip below, and any tagged effects as
 *  clickable chips. State is per-skill to remember which level the user is
 *  currently viewing. */
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
  const levels = skill.levels?.length
    ? skill.levels
    : skill.description
      ? [{ level: 1, description: skill.description }]
      : [];

  const [activeLv, setActiveLv] = useState(levels[0]?.level ?? 1);
  const active = levels.find((l) => l.level === activeLv) ?? levels[0];

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

      {levels.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {levels.map((lv) => (
            <button
              key={lv.level}
              type="button"
              onClick={() => setActiveLv(lv.level)}
              className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                lv.level === activeLv
                  ? 'bg-[var(--color-brand-gold)] text-[var(--color-ink)]'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              Lv{lv.level}
            </button>
          ))}
        </div>
      )}

      <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">
        {active?.description || (
          <span className="text-white/40">Chưa có mô tả cho cấp này.</span>
        )}
      </p>

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
              return (
                <Link
                  key={eid}
                  href={`/effects/${eid}`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs hover:border-[var(--color-brand-gold)]/40"
                >
                  <span>{e.name || e.en_name || e.id}</span>
                  <span
                    className={`rounded px-1 py-0 text-[9px] font-semibold ${
                      EFFECT_KIND_CHIP[e.kind] ?? EFFECT_KIND_CHIP.other
                    }`}
                  >
                    {e.kind === 'buff'
                      ? 'B'
                      : e.kind === 'debuff'
                        ? 'D'
                        : '·'}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
