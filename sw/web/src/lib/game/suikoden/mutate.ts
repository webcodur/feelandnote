// 천도 v2 — 초안 상태를 바꾸는 공용 동작. 호출하는 쪽이 복제본(draft)을 넘긴다.

import { FAME_MAX, LEVEL_XP, LOG_LIMIT, LOYALTY, BUILDING_EFFECT, WORLD_LOG_CODES } from './constants'
import type { TerritoryId } from './map'
import { heroMaxTroops, heroStateOf, hasBuilding, PLAYER_ID, territoriesOf, turnLimit } from './query'
import { STAR_COUNT } from './stars'
import type { GameEvent, GameState, Hero, HeroState, LogEntry, Outcome, Roster } from './types'

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * 판이 끝났는지 본다. 달이 넘어갈 때와, 플레이어가 낀 싸움·항복이 끝난 바로 뒤에 부른다 —
 * 마지막 적을 꺾은 그 자리에서 통일을, 마지막 땅을 잃은 그 자리에서 패망을 알린다(달 넘기기를 기다리지 않는다).
 * 판이 끝나면 phase를 result로 돌려 달 넘기기·명령이 더 먹지 않게 한다.
 */
export function checkOutcome(state: GameState): Outcome | null {
  if (state.outcome) {
    state.phase = 'result'
    return state.outcome
  }
  const player = state.playerFaction ? state.factions[state.playerFaction] : null
  let outcome: Outcome | null = null
  if (player) {
    const lands = territoriesOf(state, PLAYER_ID)
    const rivals = Object.values(state.factions).filter((f) => f.alive && !f.isPlayer)
    const allMine = Object.values(state.territories).every((t) => t.owner === PLAYER_ID)
    if (lands.length === 0) outcome = { kind: 'fallen', turn: state.turn }
    else if (rivals.length === 0 || allMine) {
      // 남은 빈 땅은 스스로 귀순한다
      for (const t of Object.values(state.territories)) if (!t.owner) { t.owner = PLAYER_ID; t.militia = 0 }
      outcome = { kind: 'unified', turn: state.turn }
    }
  }
  if (!outcome && state.turn >= turnLimit(state)) outcome = { kind: 'timeout', turn: state.turn }
  if (outcome) {
    state.outcome = outcome
    state.phase = 'result'
    // 달 중간에 끝나면 달 결산의 최대 영토 갱신을 거치지 않으므로 여기서 맞춘다(귀순한 빈 땅까지)
    if (player) state.stats.maxTerritories = Math.max(state.stats.maxTerritories, territoriesOf(state, PLAYER_ID).length)
  }
  return outcome
}

export function pushLog(state: GameState, code: string, params: LogEntry['params'] = {}, mine = false): LogEntry {
  const entry: LogEntry = { turn: state.turn, code, params, mine }
  // 남의 세력 잔일(인재 찾기·합류 등)은 남기지 않는다 — 기록 칸이 우리 이야기로 차도록
  if (!mine && !WORLD_LOG_CODES.has(code)) return entry
  state.log.push(entry)
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT)
  return entry
}

export function pushEvent(state: GameState, event: Omit<GameEvent, 'id' | 'turn' | 'resolved'>): GameEvent {
  const full: GameEvent = { ...event, id: ++state.eventSeq, turn: state.turn, resolved: false }
  state.events.push(full)
  return full
}

export function addFame(state: GameState, factionId: string | null, delta: number): void {
  if (!factionId) return
  const f = state.factions[factionId]
  if (!f) return
  f.fame = clamp(Math.round(f.fame + delta), 0, FAME_MAX)
}

/** 인물 상태를 초안에 올린다(없으면 재야 기본값으로 만든다) */
export function ensureHero(state: GameState, hero: Hero): HeroState {
  const existing = state.heroes[hero.id]
  if (existing) return existing
  const created = { ...heroStateOf(state, hero) }
  state.heroes[hero.id] = created
  return created
}

export interface JoinOptions {
  loc: TerritoryId
  troopRate?: number
  loyalty?: number
  companion?: boolean
}

/** 인물이 세력에 합류한다. 플레이어 세력이면 108성 칭호를 차례로 받는다 */
export function joinFaction(state: GameState, roster: Roster, hero: Hero, factionId: string, opts: JoinOptions): HeroState {
  const hs = ensureHero(state, hero)
  const faction = state.factions[factionId]
  const lord = faction ? roster.byId.get(faction.lordId) : undefined
  hs.status = faction && faction.lordId === hero.id ? 'lord' : 'officer'
  hs.faction = factionId
  hs.loc = opts.loc
  hs.acted = true
  hs.task = null
  hs.joinedTurn = state.turn
  const baseLoyalty = LOYALTY.joinBase
    + (lord ? lord.stats.charm * LOYALTY.lordCharm : 10)
    + hero.stats.loyalty * LOYALTY.heroLoyalty
    + (opts.companion ? LOYALTY.companionBonus : 0)
  hs.loyalty = Math.round(clamp(opts.loyalty ?? baseLoyalty, 20, 100))
  const max = heroMaxTroops(hero, hs, state)
  if (opts.troopRate !== undefined) hs.troops = Math.max(hs.troops, Math.round(max * opts.troopRate))
  hs.troops = Math.min(hs.troops, max)
  if (faction) delete faction.discovered[hero.id]
  if (factionId === PLAYER_ID && faction) assignStar(state, faction.stars, hs)
  return hs
}

/**
 * 108성 칭호 자리 잡기. stars[i]는 i번째 별의 지금(또는 마지막) 주인이다.
 * 떠났다 돌아온 별은 제 자리를 되찾고, 108자리가 다 찼으면 떠난 별의 빈자리를 새 사람이 잇는다.
 * 같은 사람이 두 자리를 갖지 않는다.
 */
function assignStar(state: GameState, stars: string[], hs: HeroState): void {
  const own = stars.indexOf(hs.id)
  if (own >= 0) { hs.star = own; return }
  if (stars.length < STAR_COUNT) { hs.star = stars.length; stars.push(hs.id); return }
  const vacant = stars.findIndex((id) => {
    const holder = state.heroes[id]
    return !holder || holder.faction !== PLAYER_ID || (holder.status !== 'officer' && holder.status !== 'lord')
  })
  if (vacant < 0) { hs.star = null; return }
  const gone = state.heroes[stars[vacant]]
  if (gone && gone.star === vacant) gone.star = null
  stars[vacant] = hs.id
  hs.star = vacant
}

/** 인물을 재야로 돌린다(세력 이탈·석방·세력 멸망) */
export function releaseHero(state: GameState, hero: Hero, loc?: TerritoryId): void {
  const hs = ensureHero(state, hero)
  const wasPlayer = hs.faction === PLAYER_ID
  if (wasPlayer && hs.star !== null) {
    // 뒤 사람이 당겨 받지 않는다 — 자리는 비어 있다가 돌아오면 되찾는다(assignStar)
    hs.star = null
  }
  hs.status = 'free'
  hs.faction = null
  hs.loc = loc ?? hs.loc
  hs.troops = 0
  hs.acted = true
  hs.task = null
  for (const t of Object.values(state.territories)) if (t.governor === hero.id) t.governor = null
}

export function gainXp(state: GameState, hs: HeroState, amount: number): void {
  const t = state.territories[hs.loc]
  const bonus = t && t.owner === hs.faction && hasBuilding(t, 'academy') ? BUILDING_EFFECT.academyXp : 1
  hs.xp += Math.round(amount * bonus)
  let level = 1
  LEVEL_XP.forEach((need, i) => { if (hs.xp >= need) level = i + 1 })
  hs.level = Math.min(LEVEL_XP.length, level)
}

/** 영토 주인을 바꾸고 태수를 정리한다 */
export function setOwner(state: GameState, territory: TerritoryId, factionId: string | null): void {
  const t = state.territories[territory]
  t.owner = factionId
  t.governor = null
  t.delegate = factionId === PLAYER_ID ? t.delegate : false
  if (factionId) t.militia = 0
}

/** 태수가 없거나 자리에 없으면 그 영토에서 가장 통솔 높은 무장을 앉힌다 */
export function fixGovernor(state: GameState, roster: Roster, territory: TerritoryId): void {
  const t = state.territories[territory]
  if (!t.owner) { t.governor = null; return }
  const current = t.governor ? state.heroes[t.governor] : null
  if (current && current.faction === t.owner && current.loc === territory && (current.status === 'officer' || current.status === 'lord')) return
  let best: string | null = null
  let bestScore = -1
  for (const hs of Object.values(state.heroes)) {
    if (hs.faction !== t.owner || hs.loc !== territory) continue
    if (hs.status !== 'officer' && hs.status !== 'lord') continue
    const hero = roster.byId.get(hs.id)
    if (!hero) continue
    const score = hero.stats.command * 0.6 + hero.stats.charm * 0.4
    if (score > bestScore) { bestScore = score; best = hs.id }
  }
  t.governor = best
}
