// 천도 v2 — 인물 명부: 서버 튜플 → 게임 인물(스탯·등급·병과·고향)

import {
  DERIVED_NOISE, GRADE_THRESHOLDS, PROFESSION_ARCHETYPE, PROFESSION_CLASS, STAT_KEYS, TROOPS, GRADE_INFO, LEVEL_BONUS,
} from './constants'
import { homeTerritoryFor, TERRITORY_IDS, type TerritoryId } from './map'
import { hashUnit } from './rng'
import type { Grade, Hero, HeroStats, ProfessionCode, Reality, Roster, RosterRow } from './types'

const PROFESSIONS = new Set(Object.keys(PROFESSION_ARCHETYPE))

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function gradeScore(stats: Pick<HeroStats, 'command' | 'martial' | 'intellect' | 'charm'>): number {
  const sorted = [stats.command, stats.martial, stats.intellect, stats.charm].sort((a, b) => b - a)
  return Math.round((sorted[0] * 0.4 + sorted[1] * 0.3 + sorted[2] * 0.2 + sorted[3] * 0.1) * 10) / 10
}

export function gradeOf(score: number): Grade {
  for (const t of GRADE_THRESHOLDS) if (score >= t.min) return t.grade
  return 'E'
}

/** 스탯이 없는 인물 — 직군 원형에 인물마다 고정된 흔들림과 지명도를 더한다 */
function deriveStats(id: string, prof: ProfessionCode, renown: number): HeroStats {
  const [cmd, mar, int, cha] = PROFESSION_ARCHETYPE[prof]
  const lift = renown * 10
  const ability = (base: number, key: string) =>
    Math.round(clamp(base + lift + hashUnit(`${id}:${key}`) * DERIVED_NOISE.ability, 5, 96))
  const virtue = (key: string) => Math.round(clamp(58 + hashUnit(`${id}:${key}`) * DERIVED_NOISE.virtue, 10, 95))
  const disposition = (key: string) => Math.round(clamp(hashUnit(`${id}:${key}`) * DERIVED_NOISE.disposition, -45, 45))
  return {
    command: ability(cmd, 'command'),
    martial: ability(mar, 'martial'),
    intellect: ability(int, 'intellect'),
    charm: ability(cha, 'charm'),
    temperance: virtue('temperance'),
    diligence: virtue('diligence'),
    reflection: virtue('reflection'),
    courage: virtue('courage'),
    loyalty: virtue('loyalty'),
    benevolence: virtue('benevolence'),
    fairness: virtue('fairness'),
    humility: virtue('humility'),
    pessimism_optimism: disposition('po'),
    conservative_progressive: disposition('cp'),
    individual_social: disposition('is'),
    cautious_bold: disposition('cb'),
  }
}

function renownOf(views: number, influence: number): number {
  const v = Math.log10(1 + Math.max(0, views)) / Math.log10(301)
  return clamp(v * 0.5 + (Math.max(0, influence) / 80) * 0.5, 0, 1)
}

const REALITY: Record<RosterRow[11], Reality> = { R: 'real', F: 'fiction', B: 'both' }

export function decodeHero(row: RosterRow, avatarBase: string): Hero {
  const [id, name, title, profRaw, nat, gender, birth, death, avatar, statsRaw, influence, reality, voiceV, views] = row
  const prof = (PROFESSIONS.has(profRaw) ? profRaw : 'other') as ProfessionCode
  const renown = renownOf(views, influence)
  let stats: HeroStats
  let derived = false
  if (Array.isArray(statsRaw) && statsRaw.length === STAT_KEYS.length) {
    stats = Object.fromEntries(STAT_KEYS.map((k, i) => [k, statsRaw[i]])) as unknown as HeroStats
  } else {
    stats = deriveStats(id, prof, renown)
    derived = true
  }
  const score = gradeScore(stats)
  const avatarUrl = typeof avatar === 'number'
    ? `${avatarBase}/celebs/${id}/avatar.webp?v=${avatar}`
    : typeof avatar === 'string' && avatar ? avatar : null
  return {
    id,
    name,
    title,
    prof,
    nat,
    female: gender === null ? null : gender === 0,
    birth,
    death,
    avatar: avatarUrl,
    stats,
    derived,
    score,
    grade: gradeOf(score),
    cls: PROFESSION_CLASS[prof],
    home: homeTerritoryFor(nat, prof, birth),
    reality: REALITY[reality] ?? 'real',
    voiceV,
    renown,
  }
}

export function buildRoster(rows: RosterRow[], avatarBase: string): Roster {
  const heroes = rows.map((row) => decodeHero(row, avatarBase))
  const byId = new Map(heroes.map((h) => [h.id, h]))
  const byHome = new Map<TerritoryId, Hero[]>(TERRITORY_IDS.map((id) => [id, []]))
  for (const h of heroes) byHome.get(h.home)!.push(h)
  for (const list of byHome.values()) list.sort((a, b) => b.score - a.score)
  return { heroes, byId, byHome }
}

// ── 파생 수치 ──

export function levelMultiplier(level: number): number {
  return 1 + (Math.max(1, level) - 1) * LEVEL_BONUS
}

/** 거느릴 수 있는 병력 상한 */
export function maxTroopsOf(hero: Hero, level = 1): number {
  const raw = (TROOPS.base + hero.stats.command * TROOPS.command + hero.stats.martial * TROOPS.martial)
    * GRADE_INFO[hero.grade].troopMult * levelMultiplier(level)
  return Math.round(raw / 10) * 10
}

/** 군주로서의 그릇 — AI 세력 우두머리를 고를 때 쓴다 */
export function lordScore(hero: Hero): number {
  const s = hero.stats
  const profBonus = hero.prof === 'leader' || hero.prof === 'commander' || hero.prof === 'politician' ? 6 : 0
  return s.command * 0.45 + s.charm * 0.3 + s.intellect * 0.15 + s.martial * 0.1 + profBonus + hero.renown * 8
}

/** 출생 연도 차이로 본 같은 시대 여부 */
export function sameEra(a: Hero, b: Hero): boolean {
  if (a.birth === null || b.birth === null) return false
  return Math.abs(a.birth - b.birth) <= 80
}
