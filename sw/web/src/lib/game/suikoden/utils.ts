// 천도 — 유틸리티 함수

import type { GameCharacter, Stats, Grade, TerritoryId, RegionId, Faction, GameState, TerritoryDef } from './types'
import type { PersonaStats } from '@/lib/persona/types'
import { PROFESSION_TO_CLASS, GRADE_THRESHOLDS, NATIONALITY_TO_REGION, NATIONALITY_TO_TERRITORY, GRADE_TROOPS, TERRITORIES } from './constants'

// ── DB → GameCharacter 변환 (16페르소나 매핑) ──

interface DbProfile {
  id: string
  nickname?: string | null
  title?: string | null
  profession?: string | null
  nationality?: string | null
  gender?: boolean | null
  birth_date?: string | null
  death_date?: string | null
  bio?: string | null
  avatar_url?: string | null
}

interface DbInfluence {
  strategic?: number | null
  tech?: number | null
  political?: number | null
  social?: number | null
  economic?: number | null
  cultural?: number | null
  transhistoricity?: number | null
  total_score?: number | null
}

export function dbToCharacter(profile: DbProfile, influence: DbInfluence, persona?: PersonaStats): GameCharacter {
  const totalScore = influence.total_score ?? 0

  // 페르소나 16값 → Stats 직접 매핑
  let stats: Stats
  if (persona) {
    stats = { ...persona }
  } else {
    // influence 기반 폴백: 0~10 → 0~100 스케일
    const strategic = influence.strategic ?? 0
    const tech = influence.tech ?? 0
    const political = influence.political ?? 0
    const social = influence.social ?? 0
    const cultural = influence.cultural ?? 0
    stats = {
      command: Math.min(100, Math.round(strategic * 10)),
      martial: Math.min(100, Math.round(tech * 8)),
      intellect: Math.min(100, Math.round(political * 10)),
      charm: Math.min(100, Math.round(cultural * 10)),
      temperance: 50, diligence: 50, reflection: 50, courage: 50,
      loyalty: Math.min(100, Math.round(social * 10)),
      benevolence: 50, fairness: 50, humility: 50,
      pessimism_optimism: 0, conservative_progressive: 0,
      individual_social: 0, cautious_bold: 0,
    }
  }

  const gradeScore = calcPersonaGrade(stats.command, stats.martial, stats.intellect, stats.charm)
  const grade = calcGrade(gradeScore)

  const effectiveGrade = grade
  const maxTroops = GRADE_TROOPS[effectiveGrade]

  // HP = 100 + command * 0.5 + martial * 0.3
  const hp = Math.max(10, Math.round(100 + stats.command * 0.5 + stats.martial * 0.3))

  return {
    id: profile.id,
    nickname: profile.nickname ?? '???',
    title: profile.title ?? '',
    profession: profile.profession ?? 'other',
    nationality: profile.nationality ?? '',
    gender: profile.gender ?? null,
    birthDate: profile.birth_date ?? '',
    deathDate: profile.death_date ?? '',
    bio: profile.bio ?? '',
    quotes: '',
    avatarUrl: profile.avatar_url ?? null,
    stats,
    hp,
    maxHp: hp,
    grade,
    personaGrade: persona != null ? grade : undefined,
    personaGradeScore: persona != null ? gradeScore : undefined,
    unitClass: (profile.profession ? PROFESSION_TO_CLASS[profile.profession] : undefined) ?? 'ranger',
    totalScore,
    troops: maxTroops,
    maxTroops,
    loyaltyValue: Math.min(100, stats.loyalty),
    morale: 80,
    equipment: { weapons: 0, horses: 0, ships: 0, charms: 0 },
  }
}

// ── 페르소나 기반 등급 계산 ──

function calcPersonaGrade(command: number, martial: number, intellect: number, charm: number): number {
  const sorted = [command, martial, intellect, charm].sort((a, b) => b - a)
  return sorted[0] * 0.4 + sorted[1] * 0.3 + sorted[2] * 0.2 + sorted[3] * 0.1
}

/** personaGrade 우선, 없으면 기존 grade 폴백 */
export function getEffectiveGrade(c: GameCharacter): Grade {
  return c.personaGrade ?? c.grade
}

/** personaGrade 점수 (숫자) 반환. persona 없으면 totalScore 폴백 */
export function getEffectiveGradeScore(c: GameCharacter): number {
  return c.personaGradeScore ?? c.totalScore
}

// ── 등급 계산 ──

function calcGrade(totalScore: number): Grade {
  for (const t of GRADE_THRESHOLDS) {
    if (totalScore >= t.min) return t.grade
  }
  return 'E'
}

// ── 지역 판별 ──

export function getRegionForNationality(nat: string): RegionId {
  return NATIONALITY_TO_REGION[nat] ?? 'west_europe'
}

export function getTerritoryForNationality(nat: string): TerritoryId {
  return NATIONALITY_TO_TERRITORY[nat] ?? 'paris'
}

// ── 연도 추출 ──

export function getBirthYear(birthDate: string): number {
  if (!birthDate) return 0
  if (/^-?\d{1,4}$/.test(birthDate)) return parseInt(birthDate, 10)
  const bMatch = birthDate.match(/^(-?\d{1,4})-/)
  if (bMatch) return parseInt(bMatch[1], 10)
  return 0
}

export function getDeathYear(deathDate: string): number {
  if (!deathDate) return 9999
  if (/^-?\d{1,4}$/.test(deathDate)) return parseInt(deathDate, 10)
  const dMatch = deathDate.match(/^(-?\d{1,4})-/)
  if (dMatch) return parseInt(dMatch[1], 10)
  return 9999
}

// ── 셔플 ──

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Faction / Territory 헬퍼 ──

/** 영토 정의 조회 (상수 테이블) */
export function getTerritoryDef(id: TerritoryId): TerritoryDef | undefined {
  return TERRITORIES.find(t => t.id === id)
}

/** 세력 총 병력 */
export function getTotalTroops(faction: Faction): number {
  return faction.members.reduce((s, m) => s + m.troops, 0)
}

/** 세력 총 전력 (totalScore 합산) */
export function getTotalPower(faction: Faction): number {
  return faction.members.reduce((s, m) => s + m.totalScore, 0)
}

/** 인접 영토 정보 조회 */
function getNeighborInfo(state: GameState, territoryId: TerritoryId) {
  const def = getTerritoryDef(territoryId)
  if (!def) return []
  return def.neighbors.map(nId => {
    const owner = state.factions.find(f => f.territories.some(t => t.id === nId))
    return { id: nId as TerritoryId, name: getTerritoryDef(nId)?.name ?? nId, owner }
  })
}

/** 활성 거점만 필터한 인접 영토 정보 */
export function getActiveNeighborInfo(state: GameState, territoryId: TerritoryId) {
  const all = getNeighborInfo(state, territoryId)
  if (state.activeTerritoryIds.length === 0) return all
  const active = new Set(state.activeTerritoryIds)
  return all.filter(n => active.has(n.id))
}

/** 거점 ID가 활성 거점에 포함되는지 확인 (빈 배열 = 전체 활성) */
export function isActiveTerritory(state: GameState, tid: TerritoryId): boolean {
  return state.activeTerritoryIds.length === 0 || state.activeTerritoryIds.includes(tid)
}

/** 지역 ID가 활성 지역에 포함되는지 확인 (빈 배열 = 전체 활성) */
export function isActiveRegion(state: GameState, rid: RegionId): boolean {
  return state.activeRegionIds.length === 0 || state.activeRegionIds.includes(rid)
}
