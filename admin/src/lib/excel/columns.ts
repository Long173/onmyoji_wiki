/** Excel sheet column definitions + bidirectional row ↔ flat-object
 *  mappers for each table. Used by both export (DB row → xlsx cells) and
 *  import (xlsx cells → DB row payload for upsert).
 *
 *  Design choices:
 *  - Stats are flattened to 16 columns (hp_value / hp_tier / ...) so users
 *    can bulk-edit numbers + tiers comfortably in spreadsheet UI.
 *  - Nested arrays of objects (`skills`, `soul.effects`) are JSON-stringified
 *    into a single cell. Excel cell limit is 32767 chars — plenty.
 *  - Text arrays (`friendly_name`, `obtain`, `recommended_souls`,
 *    `countered_by`) are pipe-separated (`a | b | c`) so commas inside
 *    string values don't break parsing.
 */

import type {
  EffectRow,
  ShikigamiRow,
  ShikigamiStats,
  Skill,
  SlotMains,
  SoulEffect,
  SoulRow,
} from '../types';
import { emptySlotMains, emptyStats, STAT_TIERS } from '../types';

const STAT_KEYS: (keyof ShikigamiStats)[] = [
  'hp',
  'attack',
  'defense',
  'speed',
  'crit_rate',
  'crit_dmg',
  'accuracy',
  'resist',
];

const LIST_SEP = ' | ';

// ─── String <-> List helpers ──────────────────────────────────────────
function listToCell(arr: string[] | undefined): string {
  return Array.isArray(arr) && arr.length ? arr.join(LIST_SEP) : '';
}

function cellToList(raw: unknown): string[] {
  if (raw == null || raw === '') return [];
  return String(raw)
    .split(LIST_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

function jsonToCell(obj: unknown): string {
  if (obj == null) return '';
  return JSON.stringify(obj);
}

function cellToJson<T>(raw: unknown, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    throw new Error(`không parse được JSON: ${String(raw).slice(0, 80)}`);
  }
}

function cellToString(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'object' && raw !== null && 'text' in raw) {
    // ExcelJS rich-text cells come back as { text } / { richText: [...] }.
    return String((raw as { text: string }).text ?? '');
  }
  return String(raw);
}

function cellToInt(raw: unknown, fallback = 0): number {
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function cellToTier(raw: unknown): string {
  const s = cellToString(raw).toUpperCase().trim();
  return (STAT_TIERS as readonly string[]).includes(s) ? s : '';
}

function cellToBool(raw: unknown): boolean {
  if (raw == null || raw === '') return false;
  if (typeof raw === 'boolean') return raw;
  const s = String(raw).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'y';
}

// ─── SHIKIGAMI ────────────────────────────────────────────────────────
export interface ShikigamiColumn {
  header: string;
  key: string;
  width: number;
}

export const SHIKIGAMI_COLUMNS: ShikigamiColumn[] = [
  { header: 'id', key: 'id', width: 22 },
  { header: 'rarity', key: 'rarity', width: 8 },
  { header: 'name_vi', key: 'name_vi', width: 28 },
  { header: 'name_en', key: 'name_en', width: 22 },
  { header: 'friendly_name', key: 'friendly_name', width: 30 },
  { header: 'description', key: 'description', width: 50 },
  { header: 'obtain', key: 'obtain', width: 24 },
  { header: 'lore', key: 'lore', width: 60 },
  { header: 'recommended_souls', key: 'recommended_souls', width: 30 },
  { header: 'slot_mains_json', key: 'slot_mains_json', width: 40 },
  { header: 'countered_by', key: 'countered_by', width: 30 },
  { header: 'image', key: 'image', width: 36 },
  { header: 'source_url', key: 'source_url', width: 28 },
  { header: 'sort_index', key: 'sort_index', width: 10 },
  { header: 'is_finish', key: 'is_finish', width: 10 },
  // 16 stat columns
  ...STAT_KEYS.flatMap((stat) => [
    {
      header: `${stat}_value`,
      key: `${stat}_value`,
      width: 12,
    },
    {
      header: `${stat}_tier`,
      key: `${stat}_tier`,
      width: 8,
    },
  ]),
  { header: 'skills_json', key: 'skills_json', width: 60 },
];

export function shikigamiToRow(s: ShikigamiRow): Record<string, unknown> {
  const stats = s.stats ?? emptyStats();
  const flatStats: Record<string, unknown> = {};
  for (const key of STAT_KEYS) {
    flatStats[`${key}_value`] = stats[key]?.value ?? 0;
    flatStats[`${key}_tier`] = stats[key]?.tier ?? '';
  }
  return {
    id: s.id,
    rarity: s.rarity,
    name_vi: s.name_vi,
    name_en: s.name_en,
    friendly_name: listToCell(s.friendly_name),
    description: s.description,
    obtain: listToCell(s.obtain),
    lore: s.lore,
    recommended_souls: listToCell(s.recommended_souls),
    slot_mains_json: jsonToCell(s.slot_mains ?? emptySlotMains()),
    countered_by: listToCell(s.countered_by),
    image: s.image,
    source_url: s.source_url,
    sort_index: s.sort_index,
    is_finish: Boolean(s.is_finish),
    ...flatStats,
    skills_json: jsonToCell(s.skills),
  };
}

export function rowToShikigami(
  row: Record<string, unknown>,
): Partial<ShikigamiRow> {
  const stats = emptyStats();
  for (const key of STAT_KEYS) {
    stats[key] = {
      value: cellToInt(row[`${key}_value`], key === 'crit_dmg' ? 150 : 0),
      tier: cellToTier(row[`${key}_tier`]) as ShikigamiStats[typeof key]['tier'],
    };
  }
  return {
    id: cellToString(row.id).trim(),
    rarity: cellToString(row.rarity).toUpperCase() as ShikigamiRow['rarity'],
    name_vi: cellToString(row.name_vi),
    name_en: cellToString(row.name_en),
    friendly_name: cellToList(row.friendly_name),
    description: cellToString(row.description),
    obtain: cellToList(row.obtain),
    lore: cellToString(row.lore),
    recommended_souls: cellToList(row.recommended_souls),
    slot_mains: cellToJson<SlotMains>(row.slot_mains_json, emptySlotMains()),
    countered_by: cellToList(row.countered_by),
    image: cellToString(row.image),
    source_url: cellToString(row.source_url),
    sort_index: cellToInt(row.sort_index),
    is_finish: cellToBool(row.is_finish),
    stats,
    skills: cellToJson<Skill[]>(row.skills_json, []),
  };
}

// ─── SOULS ────────────────────────────────────────────────────────────
export const SOUL_COLUMNS: ShikigamiColumn[] = [
  { header: 'id', key: 'id', width: 22 },
  { header: 'kind', key: 'kind', width: 10 },
  { header: 'name_vi', key: 'name_vi', width: 24 },
  { header: 'name_en', key: 'name_en', width: 24 },
  { header: 'image', key: 'image', width: 30 },
  { header: 'sort_index', key: 'sort_index', width: 10 },
  { header: 'is_finish', key: 'is_finish', width: 10 },
  { header: 'effects_json', key: 'effects_json', width: 80 },
];

export function soulToRow(s: SoulRow): Record<string, unknown> {
  return {
    id: s.id,
    kind: s.kind,
    name_vi: s.name_vi,
    name_en: s.name_en,
    image: s.image,
    sort_index: s.sort_index,
    is_finish: Boolean(s.is_finish),
    effects_json: jsonToCell(s.effects),
  };
}

export function rowToSoul(row: Record<string, unknown>): Partial<SoulRow> {
  const kindRaw = cellToString(row.kind).toLowerCase();
  const kind: SoulRow['kind'] = kindRaw === 'boss' ? 'boss' : 'normal';
  return {
    id: cellToString(row.id).trim(),
    kind,
    name_vi: cellToString(row.name_vi),
    name_en: cellToString(row.name_en),
    image: cellToString(row.image),
    sort_index: cellToInt(row.sort_index),
    is_finish: cellToBool(row.is_finish),
    effects: cellToJson<SoulEffect[]>(row.effects_json, []),
  };
}

// ─── EFFECTS ──────────────────────────────────────────────────────────
export const EFFECT_COLUMNS: ShikigamiColumn[] = [
  { header: 'id', key: 'id', width: 22 },
  { header: 'kind', key: 'kind', width: 10 },
  { header: 'name', key: 'name', width: 28 },
  { header: 'en_name', key: 'en_name', width: 22 },
  { header: 'description', key: 'description', width: 60 },
  { header: 'image', key: 'image', width: 30 },
  { header: 'sort_index', key: 'sort_index', width: 10 },
  { header: 'is_finish', key: 'is_finish', width: 10 },
];

export function effectToRow(e: EffectRow): Record<string, unknown> {
  return {
    id: e.id,
    kind: e.kind,
    name: e.name,
    en_name: e.en_name,
    description: e.description,
    image: e.image,
    sort_index: e.sort_index,
    is_finish: Boolean(e.is_finish),
  };
}

export function rowToEffect(row: Record<string, unknown>): Partial<EffectRow> {
  const kindRaw = cellToString(row.kind).toLowerCase();
  const kind: EffectRow['kind'] =
    kindRaw === 'debuff' || kindRaw === 'other'
      ? (kindRaw as EffectRow['kind'])
      : 'buff';
  return {
    id: cellToString(row.id).trim(),
    kind,
    name: cellToString(row.name),
    en_name: cellToString(row.en_name),
    description: cellToString(row.description),
    image: cellToString(row.image),
    sort_index: cellToInt(row.sort_index),
    is_finish: cellToBool(row.is_finish),
  };
}
