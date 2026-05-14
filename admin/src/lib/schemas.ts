import { z } from 'zod';

import { RARITIES, SLOT_MAIN_OPTIONS, STAT_TIERS } from './types';

// Allows empty so create-form can submit with no id and the server-side
// save action auto-fills it from name fields. When non-empty it must match
// the SLUG pattern (used by both create-after-autofill and edit paths).
const SLUG = z
  .string()
  .regex(/^[a-z0-9_]*$/, 'Chỉ chữ thường, số, dấu gạch dưới');

const statValue = z.object({
  value: z.number().int().min(0),
  tier: z.enum(STAT_TIERS as readonly [string, ...string[]]),
});

const skillLevel = z.object({
  level: z.number().int().min(1).max(5),
  description: z.string().default(''),
});

const altSkillForm = z.object({
  name: z.string().default(''),
  description: z.string().default(''),
  image: z.string().default(''),
  effects: z.array(z.string()).default([]),
});

const skill = z.object({
  name: z.string().default(''),
  description: z.string().default(''),
  levels: z.array(skillLevel).default([]),
  image: z.string().default(''),
  cost: z
    .number()
    .int()
    .min(0)
    .nullable()
    .optional()
    .transform((v) => (v === null ? undefined : v)),
  // Effect ids referenced by this skill's description (`effects` table FK).
  // Stored inside the JSONB skills array; no SQL migration needed.
  effects: z.array(z.string()).default([]),
  // Same-slot alternate forms (skill transformations). Default empty.
  alt_forms: z.array(altSkillForm).default([]),
});

export const shikigamiFormSchema = z.object({
  id: SLUG,
  name_vi: z.string().default(''),
  name_jp: z.string().default(''),
  name_en: z.string().default(''),
  friendly_name: z.array(z.string()).default([]),
  rarity: z.enum(RARITIES as readonly [string, ...string[]]),
  description: z.string().default(''),
  obtain: z.array(z.string()).default([]),
  stats: z.object({
    hp: statValue,
    attack: statValue,
    defense: statValue,
    speed: statValue,
    crit_rate: statValue,
    crit_dmg: statValue,
    accuracy: statValue,
    resist: statValue,
  }),
  skills: z.array(skill).default([]),
  recommended_souls: z.array(z.string()).default([]),
  // Recommended main stats per choice slot (2/4/6). Each entry is restricted
  // to the per-slot allowed set defined in SLOT_MAIN_OPTIONS. Empty array
  // means "no recommendation"; the whole object defaults to all-empty.
  slot_mains: z
    .object({
      '2': z
        .array(
          z.enum(SLOT_MAIN_OPTIONS['2'] as readonly [string, ...string[]]),
        )
        .default([]),
      '4': z
        .array(
          z.enum(SLOT_MAIN_OPTIONS['4'] as readonly [string, ...string[]]),
        )
        .default([]),
      '6': z
        .array(
          z.enum(SLOT_MAIN_OPTIONS['6'] as readonly [string, ...string[]]),
        )
        .default([]),
    })
    .default({ '2': [], '4': [], '6': [] }),
  // Shikigami counter this one — stored as text[] on the shikigami table
  // (migration 0005). The inverse direction is queried, not stored.
  countered_by: z.array(z.string()).default([]),
  lore: z.string().default(''),
  image: z.string().default(''),
  source_url: z.string().default(''),
  is_finish: z.boolean().default(false),
});

export type ShikigamiFormValues = z.infer<typeof shikigamiFormSchema>;

// ─── Soul ────────────────────────────────────────────────────────────
const soulEffect = z.object({
  pieces: z.number().int().min(1).max(6),
  description: z.string().default(''),
});

export const soulFormSchema = z.object({
  id: SLUG,
  name_vi: z.string().default(''),
  name_en: z.string().default(''),
  kind: z.enum(['normal', 'boss']),
  effects: z.array(soulEffect).default([]),
  image: z.string().default(''),
  is_finish: z.boolean().default(false),
});

export type SoulFormValues = z.infer<typeof soulFormSchema>;

// ─── Effect ──────────────────────────────────────────────────────────
export const effectFormSchema = z.object({
  id: SLUG,
  name: z.string().default(''),
  en_name: z.string().default(''),
  kind: z.enum(['buff', 'debuff', 'other']),
  description: z.string().default(''),
  image: z.string().default(''),
  is_finish: z.boolean().default(false),
});

export type EffectFormValues = z.infer<typeof effectFormSchema>;
