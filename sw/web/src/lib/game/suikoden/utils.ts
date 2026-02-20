// 천도 — 유틸리티 함수

import type { GameCharacter, GameItem, Stats, Grade, ItemGrade, UnitClass, ContentType, ItemCategory, TerritoryId, TacticType, BattleParticipant, BuildingCard } from './types'
import { PROFESSION_TO_CLASS, GRADE_THRESHOLDS, ITEM_GRADE_THRESHOLDS, NATIONALITY_TO_REGION, NATIONALITY_TO_TERRITORY, GRADE_TROOPS, TACTIC_MATCHUP, CLASS_TACTIC_BONUS, BUILDINGS, TACTIC_INFO } from './constants'
import type { RegionId } from './types'

// ── DB → GameCharacter 변환 (7스탯 매핑) ──

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
  portrait_url?: string | null
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

export function dbToCharacter(profile: DbProfile, influence: DbInfluence): GameCharacter {
  const strategic = influence.strategic ?? 0
  const tech = influence.tech ?? 0
  const political = influence.political ?? 0
  const social = influence.social ?? 0
  const cultural = influence.cultural ?? 0
  const trans = influence.transhistoricity ?? 0
  const totalScore = influence.total_score ?? 0

  const power = Math.min(10, Math.round(strategic))
  const skill = Math.min(10, Math.round(tech))
  const intellect = Math.min(10, Math.round(political))
  const stamina = Math.min(10, Math.round(trans / 4))
  const loyalty = Math.min(10, Math.round(social))
  const virtue = Math.min(10, Math.round(cultural))
  const courage = Math.min(10, Math.max(power, intellect))

  const stats: Stats = { power, skill, intellect, stamina, loyalty, virtue, courage }

  const grade = calcGrade(totalScore)
  const maxTroops = GRADE_TROOPS[grade]

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
    avatarUrl: profile.avatar_url ?? profile.portrait_url ?? null,
    stats,
    hp: Math.max(10, Math.round(trans * 2.5)),
    maxHp: Math.max(10, Math.round(trans * 2.5)),
    grade,
    unitClass: (profile.profession ? PROFESSION_TO_CLASS[profile.profession] : undefined) ?? 'ranger',
    totalScore,
    troops: maxTroops,
    maxTroops,
    loyaltyValue: Math.min(100, loyalty * 10 + 20),
    morale: 80,
    equippedScroll: null,
    equippedTreasure: null,
  }
}

// ── DB → GameItem 변환 ──

interface DbContent {
  id: string
  type: string
  title?: string | null
  creator?: string | null
  thumbnail_url?: string | null
}

interface DbUserContent {
  user_id: string
  review?: string | null
}

export function dbToItem(content: DbContent, userContent: DbUserContent, avgScore: number): GameItem {
  const ct = content.type as ContentType
  const category = contentTypeToCategory(ct)
  const grade = calcItemGrade(avgScore)
  return {
    id: content.id,
    contentType: ct,
    title: content.title ?? '???',
    creator: content.creator ?? '',
    thumbnailUrl: content.thumbnail_url ?? null,
    category,
    grade,
    bonuses: calcItemBonuses(category, avgScore),
    moralBonus: category === 'score' || category === 'painting' ? Math.floor(avgScore / 15) : 0,
    originCelebId: userContent.user_id,
    review: userContent.review ?? null,
  }
}

function contentTypeToCategory(type: ContentType): ItemCategory {
  switch (type) {
    case 'BOOK': return 'scroll'
    case 'VIDEO': return 'painting'
    case 'GAME': return 'manual'
    case 'MUSIC': return 'score'
  }
}

function calcItemBonuses(cat: ItemCategory, score: number): Partial<Stats> {
  switch (cat) {
    case 'scroll':   return { intellect: Math.floor(score / 20), virtue: Math.floor(score / 25) }
    case 'painting':  return { power: Math.floor(score / 25), intellect: Math.floor(score / 25) }
    case 'manual':   return { power: Math.floor(score / 20), skill: Math.floor(score / 20) }
    case 'score':    return { virtue: Math.floor(score / 20), courage: Math.floor(score / 30) }
  }
}

// ── 등급 계산 ──

export function calcGrade(totalScore: number): Grade {
  for (const t of GRADE_THRESHOLDS) {
    if (totalScore >= t.min) return t.grade
  }
  return 'E'
}

export function calcItemGrade(avgScore: number): ItemGrade {
  for (const t of ITEM_GRADE_THRESHOLDS) {
    if (avgScore >= t.min) return t.grade
  }
  return 'plain'
}

// ── 지역 판별 ──

export function getRegionForNationality(nat: string): RegionId {
  return NATIONALITY_TO_REGION[nat] ?? 'mediterranean'
}

export function getTerritoryForNationality(nat: string): TerritoryId {
  return NATIONALITY_TO_TERRITORY[nat] ?? 'rome'
}

// ── 연도 추출 ──

export function getDeathYear(deathDate: string): number {
  if (!deathDate) return 9999
  if (/^-?\d{1,4}$/.test(deathDate)) return parseInt(deathDate, 10)
  if (/^\d{4}-/.test(deathDate)) return parseInt(deathDate.substring(0, 4), 10)
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

  // 스탯 기반 기본 피해
  let basePower: number
  if (atkTactic === 'charge' || atkTactic === 'feint') {
    basePower = atkChar.stats.power * 2 + atkChar.stats.courage
  } else if (atkTactic === 'stratagem' || atkTactic === 'fire') {
    basePower = atkChar.stats.intellect * 2 + atkChar.stats.skill
  } else if (atkTactic === 'morale') {
    basePower = atkChar.stats.virtue * 2 + atkChar.stats.courage
  } else {
    // defend
    basePower = atkChar.stats.stamina * 2 + atkChar.stats.power
  }

  // 아이템 보너스
  let itemBonus = 0
  if (atkChar.equippedScroll) {
    const bonuses = atkChar.equippedScroll.bonuses
    if (atkTactic === 'charge' || atkTactic === 'feint') itemBonus += (bonuses.power ?? 0) * 2
    if (atkTactic === 'stratagem' || atkTactic === 'fire') itemBonus += (bonuses.intellect ?? 0) * 2
  }
  if (atkChar.equippedTreasure) {
    const bonuses = atkChar.equippedTreasure.bonuses
    if (atkTactic === 'charge' || atkTactic === 'feint') itemBonus += (bonuses.power ?? 0) * 2
    if (atkTactic === 'stratagem' || atkTactic === 'fire') itemBonus += (bonuses.intellect ?? 0) * 2
  }

  // 병사 수 보정
  const troopMul = 1 + attacker.troops / 500

  // 성벽 방어 보정 (방어측만)
  const wallDefense = defenderHasWalls ? 0.7 : 1.0

  // 랜덤 요소
  const randomFactor = 0.85 + Math.random() * 0.3

  const damage = Math.max(1, Math.round(
    (basePower + itemBonus) * (1 + classBonus) * matchup * troopMul * wallDefense * randomFactor
  ))

  // 병사 손실
  const troopLoss = Math.max(0, Math.floor(attacker.troops * tacticCostRate + damage * 0.5))

  // 사기 변동
  let moraleDelta = 0
  if (atkTactic === 'morale') {
    moraleDelta = 10 + Math.floor(atkChar.stats.virtue) // 공격자 사기 회복
  }
  if (defTactic === 'morale') {
    moraleDelta = -(5 + Math.floor(defender.character.stats.virtue * 0.5)) // 방어자 사기 회복 → 공격자 불이익
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

// ── 에셋 경로 ──

export function getPortraitPath(character: GameCharacter): string {
  return `/assets/suikoden/portraits/${character.id}.png`
}
