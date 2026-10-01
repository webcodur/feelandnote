// 천도 v2 — 상태 읽기 도우미. 상태를 바꾸지 않는다.

import { BUILDING_EFFECT, BUILDINGS, calendarOf, DIFFICULTY, FAME_RANKS, GRADE_INFO } from './constants'
import { neighborsOf, TERRITORY_BY_ID, TERRITORY_IDS, type TerritoryId } from './map'
import { combatValue } from './power'
import { maxTroopsOf } from './roster'
import type { BuildingType, FactionState, GameState, Hero, HeroState, Roster, TerritoryState } from './types'

export const PLAYER_ID = 'player'

/** 기록이 없으면 고향에 머무는 재야 인물로 본다 */
export function heroStateOf(state: GameState, hero: Hero): HeroState {
  return state.heroes[hero.id] ?? {
    id: hero.id,
    status: 'free',
    faction: null,
    loc: hero.home,
    troops: 0,
    training: 0,
    loyalty: 50,
    wound: 0,
    xp: 0,
    level: 1,
    acted: false,
    task: null,
    star: null,
    joinedTurn: 0,
  }
}

export function isFreeAt(state: GameState, hero: Hero, territory: TerritoryId): boolean {
  const hs = state.heroes[hero.id]
  if (!hs) return hero.home === territory
  return hs.status === 'free' && hs.loc === territory
}

/** 영토에 머무는 재야 인물(고향 사람 + 흘러든 사람) */
export function freeHeroesAt(state: GameState, roster: Roster, territory: TerritoryId): Hero[] {
  const list: Hero[] = []
  for (const hero of roster.byHome.get(territory) ?? []) {
    if (isFreeAt(state, hero, territory)) list.push(hero)
  }
  for (const hs of Object.values(state.heroes)) {
    if (hs.status !== 'free' || hs.loc !== territory) continue
    const hero = roster.byId.get(hs.id)
    if (hero && hero.home !== territory) list.push(hero)
  }
  return list
}

export function membersOf(state: GameState, factionId: string): HeroState[] {
  return Object.values(state.heroes).filter(
    (h) => h.faction === factionId && (h.status === 'officer' || h.status === 'lord'),
  )
}

/** 지금 이 세력에 몸담고 108성 칭호를 지닌 별 — 떠난 별의 빈자리는 세지 않는다 */
export function activeStars(state: GameState, factionId: string): string[] {
  const f = state.factions[factionId]
  if (!f) return []
  return f.stars.filter((id) => {
    const h = state.heroes[id]
    return !!h && h.faction === factionId && (h.status === 'officer' || h.status === 'lord')
  })
}

export function officersAt(state: GameState, territory: TerritoryId, factionId?: string): HeroState[] {
  return Object.values(state.heroes).filter(
    (h) => h.loc === territory && (h.status === 'officer' || h.status === 'lord')
      && (factionId === undefined || h.faction === factionId),
  )
}

export function prisonersOf(state: GameState, factionId: string): HeroState[] {
  return Object.values(state.heroes).filter((h) => h.status === 'prisoner' && h.faction === factionId)
}

export function territoriesOf(state: GameState, factionId: string): TerritoryState[] {
  return TERRITORY_IDS.map((id) => state.territories[id]).filter((t) => t.owner === factionId)
}

export function aliveFactions(state: GameState): FactionState[] {
  return Object.values(state.factions).filter((f) => f.alive)
}

export function playerFaction(state: GameState): FactionState | null {
  return state.playerFaction ? state.factions[state.playerFaction] ?? null : null
}

export function hasBuilding(t: TerritoryState, type: BuildingType): boolean {
  return t.buildings.some((b) => b.type === type && b.progress === 0)
}

export function canBuildHere(t: TerritoryState, type: BuildingType): boolean {
  if (t.buildings.some((b) => b.type === type)) return false
  if (t.buildings.length >= t.slots) return false
  if (BUILDINGS[type].coastal && !neighborsOf(t.id).some((n) => n.sea)) return false
  return true
}

/** 군을 움직일 수 있는 이웃. 해로는 출발지에 조선소가 있어야 열린다 */
export function marchableNeighbors(state: GameState, from: TerritoryId): TerritoryId[] {
  const t = state.territories[from]
  const port = hasBuilding(t, 'shipyard')
  return neighborsOf(from).filter((n) => !n.sea || port).map((n) => n.id)
}

export function heroMaxTroops(hero: Hero, hs: HeroState, state?: GameState): number {
  let max = maxTroopsOf(hero, hs.level)
  if (state && hs.faction) {
    const t = state.territories[hs.loc]
    if (t && t.owner === hs.faction && hasBuilding(t, 'barracks')) max = Math.round(max * BUILDING_EFFECT.barracksCap)
  }
  return max
}

export function troopsAt(state: GameState, territory: TerritoryId, factionId: string): number {
  return officersAt(state, territory, factionId).reduce((sum, h) => sum + h.troops, 0)
}

export function totalTroops(state: GameState, factionId: string): number {
  return membersOf(state, factionId).reduce((sum, h) => sum + h.troops, 0)
}

/** 세력의 대략적 힘 — 외교·AI 판단용. 부대 싸움 값의 합에 영토 몫을 조금 더한다 */
export function factionPower(state: GameState, roster: Roster, factionId: string): number {
  let power = 0
  for (const hs of membersOf(state, factionId)) {
    const hero = roster.byId.get(hs.id)
    if (!hero) continue
    power += combatValue(hero.stats, hero.cls, hs.troops, hs.training, hs.wound, hs.level)
  }
  return Math.round(power + territoriesOf(state, factionId).length * 500)
}

export function salaryOf(hero: Hero): number {
  return GRADE_INFO[hero.grade].salary
}

export function fameRank(fame: number): number {
  let rank = 0
  FAME_RANKS.forEach((min, i) => { if (fame >= min) rank = i })
  return rank
}

export function turnLimit(state: GameState): number {
  return DIFFICULTY[state.difficulty].limitYears * 12
}

export function calendar(state: GameState) {
  return calendarOf(state.turn)
}

export function relationOf(state: GameState, a: string, b: string): number {
  return state.factions[a]?.relations[b] ?? 0
}

export function treatyOf(state: GameState, a: string, b: string) {
  const treaty = state.factions[a]?.treaties[b]
  if (!treaty || treaty.until < state.turn) return null
  return treaty
}

export function isAlliedOrTruce(state: GameState, a: string, b: string): boolean {
  return treatyOf(state, a, b) !== null
}

export function territoryDef(id: TerritoryId) {
  return TERRITORY_BY_ID[id]
}

export function neighborOwners(state: GameState, id: TerritoryId): Set<string | null> {
  return new Set(neighborsOf(id).map((n) => state.territories[n.id].owner))
}

/** 전선 영토 — 이웃 가운데 남의 땅이 있는 곳 */
export function isFrontier(state: GameState, id: TerritoryId, factionId: string): boolean {
  return neighborsOf(id).some((n) => state.territories[n.id].owner !== factionId)
}

export function idleOfficers(state: GameState, factionId: string): HeroState[] {
  return membersOf(state, factionId).filter((h) => !h.acted)
}
