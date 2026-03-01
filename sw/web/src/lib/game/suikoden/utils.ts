// 천도 — 유틸리티 함수

import type { GameCharacter, Stats, Grade, UnitClass, TerritoryId, RegionId, TacticType, BattleParticipant, BuildingCard, Faction, Territory, GameState, TerritoryDef, Region } from './types'
import { PROFESSION_TO_CLASS, GRADE_THRESHOLDS, NATIONALITY_TO_REGION, NATIONALITY_TO_TERRITORY, GRADE_TROOPS, TACTIC_MATCHUP, CLASS_TACTIC_BONUS, BUILDINGS, TACTIC_INFO, TERRITORIES, REGIONS } from './constants'

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
  quotes?: string | null
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

interface DbPersona {
  // 능력 (0~100)
  command?: number | null
  martial?: number | null
  intellect?: number | null
  charisma?: number | null
  // 덕목 (0~100)
  temperance?: number | null
  diligence?: number | null
  reflection?: number | null
  courage?: number | null
  loyalty?: number | null
  benevolence?: number | null
  fairness?: number | null
  humility?: number | null
  // 성향 (-50~+50)
  pessimism_optimism?: number | null
  conservative_progressive?: number | null
  individual_social?: number | null
  cautious_bold?: number | null
}

export function dbToCharacter(profile: DbProfile, influence: DbInfluence, persona?: DbPersona): GameCharacter {
  const totalScore = influence.total_score ?? 0

  // 페르소나 16값 → Stats 직접 매핑
  let stats: Stats
  if (persona && persona.command != null) {
    stats = {
      command: persona.command ?? 0,
      martial: persona.martial ?? 0,
      intellect: persona.intellect ?? 0,
      charisma: persona.charisma ?? 0,
      temperance: persona.temperance ?? 50,
      diligence: persona.diligence ?? 50,
      reflection: persona.reflection ?? 50,
      courage: persona.courage ?? 50,
      loyalty: persona.loyalty ?? 50,
      benevolence: persona.benevolence ?? 50,
      fairness: persona.fairness ?? 50,
      humility: persona.humility ?? 50,
      pessimism_optimism: persona.pessimism_optimism ?? 0,
      conservative_progressive: persona.conservative_progressive ?? 0,
      individual_social: persona.individual_social ?? 0,
      cautious_bold: persona.cautious_bold ?? 0,
    }
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
      charisma: Math.min(100, Math.round(cultural * 10)),
      temperance: 50, diligence: 50, reflection: 50, courage: 50,
      loyalty: Math.min(100, Math.round(social * 10)),
      benevolence: 50, fairness: 50, humility: 50,
      pessimism_optimism: 0, conservative_progressive: 0,
      individual_social: 0, cautious_bold: 0,
    }
  }

  const gradeScore = calcPersonaGrade(stats.command, stats.martial, stats.intellect, stats.charisma)
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
    quotes: profile.quotes ?? '',
    avatarUrl: profile.avatar_url ?? null,
    stats,
    hp,
    maxHp: hp,
    grade,
    personaGrade: persona?.command != null ? grade : undefined,
    personaGradeScore: persona?.command != null ? gradeScore : undefined,
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

export function calcPersonaGrade(command: number, martial: number, intellect: number, charisma: number): number {
  const sorted = [command, martial, intellect, charisma].sort((a, b) => b - a)
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

export function calcGrade(totalScore: number): Grade {
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

// ── 전술 피해 계산 ──

/** 전술 상성 + 스탯 기반 피해 계산 */
export function calcTacticDamage(
  attacker: BattleParticipant,
  defender: BattleParticipant,
  atkTactic: TacticType,
  defTactic: TacticType,
  defenderHasWalls: boolean,
): { damage: number; troopLoss: number; moraleDelta: number } {
  const matchup = TACTIC_MATCHUP[atkTactic][defTactic]
  const atkChar = attacker.character

  // 기본 위력: 병과별 보정
  const classBonus = CLASS_TACTIC_BONUS[atkChar.unitClass]?.[atkTactic] ?? 0
  const tacticCostRate = TACTIC_INFO[atkTactic].troopCostRate

  // 스탯 기반 기본 피해 (0~100 스케일)
  let basePower: number
  if (atkTactic === 'charge' || atkTactic === 'feint') {
    basePower = atkChar.stats.martial * 0.2 + atkChar.stats.courage * 0.1
  } else if (atkTactic === 'stratagem' || atkTactic === 'fire') {
    basePower = atkChar.stats.intellect * 0.2 + atkChar.stats.reflection * 0.1
  } else if (atkTactic === 'morale') {
    basePower = atkChar.stats.charisma * 0.2 + atkChar.stats.benevolence * 0.1
  } else {
    // defend
    basePower = atkChar.stats.command * 0.15 + atkChar.stats.diligence * 0.1
  }

  // 장비 보정
  const eq = atkChar.equipment
  const weaponMod = eq.weapons / 10000 * 0.3    // 무기: 최대 +30% 공격력
  const horseMod = (atkTactic === 'charge') ? eq.horses / 1000 * 0.2 : 0  // 군마: 돌격 시 최대 +20%
  // 방어측 부적 → 계략/화공 저항
  const defEq = defender.character.equipment
  const charmResist = (atkTactic === 'stratagem' || atkTactic === 'fire')
    ? 1 - defEq.charms / 1000 * 0.3  // 부적: 최대 -30% 피해
    : 1.0

  // 병사 수 보정
  const troopMul = 1 + attacker.troops / 500

  // 성벽 방어 보정 (방어측만)
  const wallDefense = defenderHasWalls ? 0.7 : 1.0

  // 랜덤 요소
  const randomFactor = 0.85 + Math.random() * 0.3

  const damage = Math.max(1, Math.round(
    basePower * (1 + classBonus + weaponMod + horseMod) * matchup * troopMul * wallDefense * charmResist * randomFactor
  ))

  // 병사 손실
  const troopLoss = Math.max(0, Math.floor(attacker.troops * tacticCostRate + damage * 0.5))

  // 사기 변동 (0~100 스케일)
  let moraleDelta = 0
  if (atkTactic === 'morale') {
    moraleDelta = 10 + Math.floor(atkChar.stats.charisma * 0.1)
  }
  if (defTactic === 'morale') {
    moraleDelta = -(5 + Math.floor(defender.character.stats.charisma * 0.05))
  }

  return { damage, troopLoss, moraleDelta }
}

// ── 건물 생산량 계산 ──

export function calcBuildingOutput(card: BuildingCard, hasAssignee: boolean): Record<string, number> {
  if (card.isConstructing) return {}
  const bDef = BUILDINGS.find(b => b.id === card.defId)
  if (!bDef) return {}

  const mul = hasAssignee ? 1.5 : 1
  const output: Record<string, number> = {}
  const e = bDef.effect
  if (e.goldPerTurn) output.gold = Math.floor(e.goldPerTurn / 24 * mul)
  if (e.foodPerTurn) output.food = Math.floor(e.foodPerTurn / 24 * mul)
  if (e.knowledgePerTurn) output.knowledge = Math.floor(e.knowledgePerTurn / 24 * mul)
  if (e.materialPerTurn) output.material = Math.floor(e.materialPerTurn / 24 * mul)
  if (e.troopsPerTurn) output.troops = Math.floor(e.troopsPerTurn / 24 * mul)
  return output
}

// ── 계략 성공률 ──

export function calcTacticSuccess(casterInt: number, targetInt: number): boolean {
  const rate = Math.min(0.9, Math.max(0.1, 0.5 + (casterInt - targetInt) * 0.1))
  return Math.random() < rate
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

/** 지역 정의 조회 */
export function getRegionDef(id: RegionId): Region | undefined {
  return REGIONS.find(r => r.id === id)
}

/** 세력 총 병력 */
export function getTotalTroops(faction: Faction): number {
  return faction.members.reduce((s, m) => s + m.troops, 0)
}

/** 세력 총 전력 (totalScore 합산) */
export function getTotalPower(faction: Faction): number {
  return faction.members.reduce((s, m) => s + m.totalScore, 0)
}

/** 영토 소유 세력 조회 */
export function getTerritoryOwner(state: GameState, territoryId: TerritoryId): Faction | undefined {
  return state.factions.find(f => f.territories.some(t => t.id === territoryId))
}

/** 세력의 자원을 delta만큼 변경한 새 state 반환 */
export function updateFactionResources(
  state: GameState,
  factionId: string,
  deltas: Partial<Record<keyof Faction['resources'], number>>,
): GameState {
  return {
    ...state,
    factions: state.factions.map(f =>
      f.id !== factionId ? f : {
        ...f,
        resources: {
          gold: f.resources.gold + (deltas.gold ?? 0),
          food: f.resources.food + (deltas.food ?? 0),
          knowledge: f.resources.knowledge + (deltas.knowledge ?? 0),
          material: f.resources.material + (deltas.material ?? 0),
          troops: f.resources.troops + (deltas.troops ?? 0),
          weapons: f.resources.weapons + (deltas.weapons ?? 0),
          horses: f.resources.horses + (deltas.horses ?? 0),
          ships: f.resources.ships + (deltas.ships ?? 0),
          charms: f.resources.charms + (deltas.charms ?? 0),
        },
      },
    ),
  }
}

/** 전투 참가자 중 살아있는 자만 필터 */
export function getAliveParticipants(participants: BattleParticipant[]): BattleParticipant[] {
  return participants.filter(p => !p.isDefeated)
}

/** 인접 영토 정보 조회 */
export function getNeighborInfo(state: GameState, territoryId: TerritoryId) {
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
