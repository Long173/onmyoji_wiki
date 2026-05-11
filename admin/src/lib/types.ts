/** Row types matching the Postgres schema in supabase/migrations/0001_init.sql.
 *  Hand-written rather than codegen'd because the schema is small and stable. */

export type Rarity = 'SSR' | 'SR' | 'SP' | 'R' | 'N';
export const RARITIES: readonly Rarity[] = ['SSR', 'SR', 'SP', 'R', 'N'];

export type StatTier = '' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';
export const STAT_TIERS: readonly StatTier[] = [
  '',
  'D',
  'C',
  'B',
  'A',
  'S',
  'SS',
];

export interface StatValue {
  value: number;
  tier: StatTier;
}

export interface ShikigamiStats {
  hp: StatValue;
  attack: StatValue;
  defense: StatValue;
  speed: StatValue;
  crit_rate: StatValue;
  crit_dmg: StatValue;
  accuracy: StatValue;
  resist: StatValue;
}

export const emptyStats = (): ShikigamiStats => ({
  hp: { value: 0, tier: '' },
  attack: { value: 0, tier: '' },
  defense: { value: 0, tier: '' },
  speed: { value: 0, tier: '' },
  crit_rate: { value: 0, tier: '' },
  crit_dmg: { value: 150, tier: '' },
  accuracy: { value: 0, tier: '' },
  resist: { value: 0, tier: '' },
});

export interface SkillLevel {
  level: number;
  description: string;
}

export interface Skill {
  name: string;
  description: string;
  levels: SkillLevel[];
  image?: string;
  cost?: number;
}

export interface ShikigamiRow {
  id: string;
  name_vi: string;
  name_jp: string;
  name_en: string;
  friendly_name: string[];
  rarity: Rarity;
  description: string;
  obtain: string[];
  stats: ShikigamiStats;
  skills: Skill[];
  recommended_souls: string[];
  lore: string;
  image: string;
  source_url: string;
  sort_index: number;
  created_at?: string;
  updated_at?: string;
}

export type SoulKind = 'normal' | 'boss';

export interface SoulEffect {
  pieces: number;
  description: string;
}

export interface SoulRow {
  id: string;
  name_vi: string;
  name_en: string;
  kind: SoulKind;
  effects: SoulEffect[];
  image: string;
  sort_index: number;
}

export type EffectKind = 'buff' | 'debuff' | 'other';

export interface EffectRow {
  id: string;
  name: string;
  en_name: string;
  kind: EffectKind;
  description: string;
  image: string;
  sort_index: number;
}
