// 천도 — 유틸리티 함수

import type { GameCharacter, GameItem, Stats, Grade, ItemGrade, UnitClass, ContentType, ItemCategory, Position, BattleTile, Terrain, TerritoryId } from './types'
import { PROFESSION_TO_CLASS, GRADE_THRESHOLDS, ITEM_GRADE_THRESHOLDS, NATIONALITY_TO_REGION, NATIONALITY_TO_TERRITORY, TERRAIN_INFO, MOVE_RANGE, SHOOT_RANGE, GRADE_TROOPS } from './constants'
import type { RegionId } from './types'

// ── DB → GameCharacter 변환 (7스탯 매핑) ──

export function dbToCharacter(profile: any, influence: any): GameCharacter {
  const strategic = influence.strategic ?? 0
  const tech = influence.tech ?? 0
  const political = influence.political ?? 0
  const social = influence.social ?? 0
  const economic = influence.economic ?? 0
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
    gender: profile.gender,
    birthDate: profile.birth_date ?? '',
    deathDate: profile.death_date ?? '',
    bio: profile.bio ?? '',
    quotes: profile.quotes ?? '',
    avatarUrl: profile.avatar_url ?? profile.portrait_url ?? null,
    stats,
    hp: Math.max(10, Math.round(trans * 2.5)),
    maxHp: Math.max(10, Math.round(trans * 2.5)),
    grade,
    unitClass: PROFESSION_TO_CLASS[profile.profession] ?? 'ranger',
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

export function dbToItem(content: any, userContent: any, avgScore: number): GameItem {
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

// ── 전투 유틸 ──

export function getMovablePositions(unit: { x: number; y: number; character: { unitClass: UnitClass } }, grid: BattleTile[][]): Position[] {
  const range = MOVE_RANGE[unit.character.unitClass]
  const positions: Position[] = []
  const h = grid.length
  const w = grid[0].length

  const visited = new Map<string, number>()
  const queue: { x: number; y: number; cost: number }[] = [{ x: unit.x, y: unit.y, cost: 0 }]
  visited.set(`${unit.x},${unit.y}`, 0)

  while (queue.length > 0) {
    const cur = queue.shift()!
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nx = cur.x + dx
      const ny = cur.y + dy
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      const tile = grid[ny][nx]
      const moveCost = TERRAIN_INFO[tile.terrain].moveCost
      const totalCost = cur.cost + moveCost
      const key = `${nx},${ny}`
      if (totalCost <= range && (!visited.has(key) || visited.get(key)! > totalCost)) {
        visited.set(key, totalCost)
        if (!tile.unit) positions.push({ x: nx, y: ny })
        if (moveCost < 99) queue.push({ x: nx, y: ny, cost: totalCost })
      }
    }
  }
  return positions
}

export function getAttackablePositions(unit: { x: number; y: number; character: { unitClass: UnitClass; stats: Stats } }, grid: BattleTile[][], factionId: string): Position[] {
  const positions: Position[] = []
  const h = grid.length
  const w = grid[0].length
  const shootRange = SHOOT_RANGE[unit.character.unitClass]
  const range = shootRange > 0 && unit.character.stats.skill >= 5 ? shootRange : 1

  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (dx === 0 && dy === 0) continue
      if (Math.abs(dx) + Math.abs(dy) > range) continue
      const nx = unit.x + dx
      const ny = unit.y + dy
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      const tile = grid[ny][nx]
      // 적 유닛 공격
      if (tile.unit && tile.unit.factionId !== factionId) {
        positions.push({ x: nx, y: ny })
      }
      // 성벽/성문 공격 (인접만)
      if (Math.abs(dx) + Math.abs(dy) === 1 && (tile.terrain === 'wall' || tile.terrain === 'gate') && tile.wallHp && tile.wallHp > 0) {
        positions.push({ x: nx, y: ny })
      }
    }
  }
  return positions
}

// ── 대미지 계산 (병사 수 반영) ──

export function calcDamage(attacker: GameCharacter, defender: GameCharacter, terrain: Terrain, isRanged: boolean): number {
  const atkStat = isRanged ? attacker.stats.skill : attacker.stats.power
  const classMul = getClassAttackMultiplier(attacker.unitClass, isRanged)
  const baseDmg = atkStat * classMul

  // 병사 수 보너스
  const troopsMul = 1 + attacker.troops / 500

  const defRate = Math.min(0.7, defender.stats.power * 0.05 + TERRAIN_INFO[terrain].defBonus)
  const defMul = isRanged ? 1 - defRate * 0.5 : 1 - defRate

  const randomFactor = 0.8 + Math.random() * 0.4
  return Math.max(1, Math.round(baseDmg * troopsMul * defMul * randomFactor))
}

// ── 데미지 프리뷰 (랜덤 없음) ──

export function calcDamagePreview(
  attacker: GameCharacter,
  defender: GameCharacter,
  terrain: Terrain,
  isRanged: boolean,
  chargeDistance: number = 0,
  flankingAllies: number = 0,
): number {
  const atkStat = isRanged ? attacker.stats.skill : attacker.stats.power
  const classMul = getClassAttackMultiplier(attacker.unitClass, isRanged)
  const baseDmg = atkStat * classMul
  const troopsMul = 1 + attacker.troops / 500
  const defRate = Math.min(0.7, defender.stats.power * 0.05 + TERRAIN_INFO[terrain].defBonus)
  const defMul = isRanged ? 1 - defRate * 0.5 : 1 - defRate
  const chargeBonus = chargeDistance > 0 ? 1 + chargeDistance * (attacker.unitClass === 'general' ? 0.15 : 0.1) : 1
  const flankBonus = 1 + Math.min(0.6, flankingAllies * 0.2)
  return Math.max(1, Math.round(baseDmg * troopsMul * defMul * chargeBonus * flankBonus))
}

// ── 성벽/성문 데미지 ──

export function calcWallDamage(attacker: GameCharacter): number {
  const baseDmg = attacker.stats.power * 1.5
  const troopsMul = 1 + attacker.troops / 500
  return Math.max(1, Math.round(baseDmg * troopsMul * (0.8 + Math.random() * 0.4)))
}

function getClassAttackMultiplier(cls: UnitClass, isRanged: boolean): number {
  if (isRanged) return cls === 'artisan' ? 1.5 : cls === 'strategist' ? 1.3 : 1.0
  return cls === 'general' ? 1.5 : 1.0
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

export function getTilePath(terrain: Terrain): string {
  return `/assets/suikoden/tiles/${terrain}.png`
}
