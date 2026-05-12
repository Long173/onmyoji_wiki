import { z } from 'zod';

import { RARITIES, STAT_TIERS } from './types';

const SLUG = z
  .string()
  .min(1)
  .regex(/^[a-z0-9_]+$/, 'Chỉ chữ thường, số, dấu gạch dưới');

const statValue = z.object({
  value: z.number().int().min(0),
  tier: z.enum(STAT_TIERS as readonly [string, ...string[]]),
});

const skillLevel = z.object({
  level: z.number().int().min(1).max(5),
  description: z.string().default(''),
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
  // Shikigami counter this one — stored as text[] on the shikigami table
  // (migration 0005). The inverse direction is queried, not stored.
  countered_by: z.array(z.string()).default([]),
  lore: z.string().default(''),
  image: z.string().default(''),
  source_url: z.string().default(''),
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
});

export type EffectFormValues = z.infer<typeof effectFormSchema>;
