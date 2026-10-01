// 천도 v2 — 한 달이 흐른다: AI → 경제 → 사건 → 달력 → 판정

import { aiRelations, aiTurn } from './ai'
import { runDelegation } from './commands'
import { factionLedger, foodBuyPrice, type FactionLedger } from './economy'
import {
  BUILDING_EFFECT, calendarOf, DEV_MAX, ECONOMY, FAME_RANKS, GRADE_INFO, LOYALTY, THREATS, TERRITORY_PRESET, WOUND_HEAL,
} from './constants'
import { TERRITORY_BY_ID } from './map'
import { addFame, checkOutcome, clamp, pushEvent, pushLog, releaseHero, fixGovernor } from './mutate'
import { activeStars, fameRank, hasBuilding, heroMaxTroops, membersOf, PLAYER_ID, territoriesOf, freeHeroesAt } from './query'
import { chance, pick, pickWeighted, randInt, shuffleInPlace } from './rng'
import { STAR_COUNT } from './stars'
import type { GameState, Roster, ThreatType } from './types'

// 판정은 싸움·항복 뒤에도 부르므로 mutate에 둔다. 예전처럼 여기서도 꺼내 쓸 수 있게 다시 내보낸다
export { checkOutcome } from './mutate'

/** 이 사건이 풀리지 않으면 달을 넘길 수 없다 */
export const BLOCKING_EVENTS = new Set(['invaded', 'prisoners', 'visitor', 'discontent', 'proposal'])

export function pendingBlocking(state: GameState) {
  return state.events.filter((e) => !e.resolved && BLOCKING_EVENTS.has(e.kind))
}

// ── 경제 ── (셈은 economy.ts. 화면이 이곳에서 가져다 쓰던 이름은 그대로 내보낸다)

export { factionLedger, foodOutlook, foodPurchaseCost, foodTrend, territoryIncome, type FactionLedger, type FoodOutlook } from './economy'

function runEconomy(state: GameState, roster: Roster): FactionLedger | null {
  let playerLedger: FactionLedger | null = null
  for (const f of Object.values(state.factions)) {
    if (!f.alive) continue
    const ledger = factionLedger(state, roster, f.id)
    if (f.id === PLAYER_ID) playerLedger = ledger
    f.gold += ledger.income.gold - ledger.expense.gold
    f.food += ledger.income.food - ledger.expense.food
    const members = membersOf(state, f.id)
    if (f.gold < 0) {
      f.gold = 0
      for (const hs of members) if (hs.status === 'officer') hs.loyalty = Math.max(0, hs.loyalty - LOYALTY.unpaid)
      pushLog(state, 'unpaid', { faction: f.id }, f.isPlayer)
    }
    // 군량이 바닥나면 금고를 열어 상인에게서 비싸게 사들인다(시장이 있으면 덜 비싸다)
    if (f.food < 0 && f.gold > 0) {
      const price = foodBuyPrice(state, f.id)
      const want = -f.food
      const bought = Math.min(want, Math.floor(f.gold / price))
      if (bought > 0) {
        f.gold -= Math.ceil(bought * price)
        f.food += bought
        if (f.isPlayer) pushLog(state, 'food_bought', { amount: bought, gold: Math.ceil(bought * price) }, true)
      }
    }
    if (f.food < 0) {
      f.food = 0
      for (const hs of members) hs.troops = Math.round(hs.troops * (1 - ECONOMY.starvationDesert))
      for (const t of territoriesOf(state, f.id)) t.order = Math.max(0, t.order - 3)
      pushLog(state, 'starving', { faction: f.id }, f.isPlayer)
    }
    // 극장이 명성을 높인다
    for (const t of territoriesOf(state, f.id)) if (hasBuilding(t, 'theater')) addFame(state, f.id, BUILDING_EFFECT.theaterFame)
  }
  return playerLedger
}

function updateTerritories(state: GameState, roster: Roster): void {
  for (const t of Object.values(state.territories)) {
    const def = TERRITORY_BY_ID[t.id]
    const preset = TERRITORY_PRESET[def.size]
    if (!t.owner) {
      // 주인 없는 땅은 향병이 조금씩 다시 모인다
      t.militia = Math.min(preset.militia, Math.round(t.militia + preset.militia * 0.03))
      t.order = t.order + (t.order < 55 ? 1 : t.order > 55 ? -1 : 0)
      continue
    }
    const growth = clamp(ECONOMY.popGrowth * ((t.order - 40) / 40), -0.004, 0.006)
    t.population = Math.round(clamp(t.population * (1 + growth), 10000, preset.maxPopulation))
    const governor = t.governor ? roster.byId.get(t.governor) : null
    const target = ECONOMY.orderDrift + (governor ? (governor.stats.charm - 50) * 0.2 : -5) - (t.threat ? THREATS[t.threat.type].order * 2 : 0)
    if (t.order < target) t.order += 1
    else if (t.order > target) t.order -= 1
    if (hasBuilding(t, 'temple')) t.order += BUILDING_EFFECT.templeOrder
    if (hasBuilding(t, 'theater')) t.order += BUILDING_EFFECT.theaterOrder
    if (t.threat) t.order -= THREATS[t.threat.type].order
    t.order = clamp(Math.round(t.order), 0, 100)
    // 공사
    for (const b of t.buildings) {
      if (b.progress <= 0) continue
      b.progress -= 1
      if (b.progress === 0) {
        if (b.type === 'fortress') t.walls = Math.min(DEV_MAX + BUILDING_EFFECT.fortressWalls, t.walls + BUILDING_EFFECT.fortressWalls)
        pushLog(state, 'build_done', { building: b.type, at: t.id }, t.owner === PLAYER_ID)
      }
    }
    // 위협 출몰
    if (!t.threat) {
      for (const type of Object.keys(THREATS) as ThreatType[]) {
        if (chance(state, THREATS[type].chance)) {
          t.threat = { type, power: randInt(state, 2, 7), since: state.turn }
          pushLog(state, 'threat', { threat: type, at: t.id }, t.owner === PLAYER_ID)
          break
        }
      }
    }
  }
}

function updateHeroes(state: GameState, roster: Roster): void {
  const defectors: string[] = []
  for (const hs of Object.values(state.heroes)) {
    if (hs.status === 'free' || hs.status === 'companion') continue
    const hero = roster.byId.get(hs.id)
    if (!hero) continue
    const t = state.territories[hs.loc]
    const own = t && t.owner === hs.faction
    hs.wound = Math.max(0, hs.wound - WOUND_HEAL - (own && hasBuilding(t, 'temple') ? BUILDING_EFFECT.templeHeal : 0))
    if (hs.status === 'prisoner') {
      hs.loyalty = Math.max(0, hs.loyalty - 1)
      continue
    }
    if (own && hasBuilding(t, 'barracks')) {
      const max = heroMaxTroops(hero, hs, state)
      hs.troops = Math.min(max, Math.round(hs.troops + max * BUILDING_EFFECT.barracksRecover))
    }
    if (own && hasBuilding(t, 'academy')) hs.training = Math.min(100, hs.training + BUILDING_EFFECT.academyTraining)
    if (hs.status === 'officer' && hs.faction) {
      const f = state.factions[hs.faction]
      const lord = f ? roster.byId.get(f.lordId) : null
      const target = 68 + ((lord?.stats.charm ?? 50) - 50) * 0.3 + (f ? f.fame / 60 : 0) + (hero.stats.loyalty - 60) * 0.2
      if (hs.loyalty < target) hs.loyalty = Math.min(100, hs.loyalty + LOYALTY.drift)
      else if (hs.loyalty > target + 5) hs.loyalty = Math.max(0, hs.loyalty - LOYALTY.drift)
      if (hs.loyalty < LOYALTY.defectBelow && chance(state, LOYALTY.defectChance)) {
        const wasPlayer = hs.faction === PLAYER_ID
        const factionId = hs.faction
        releaseHero(state, hero)
        fixGovernor(state, roster, hs.loc)
        pushLog(state, 'defected', { hero: hero.id, faction: factionId }, wasPlayer)
        if (wasPlayer) defectors.push(hero.id)
      }
    }
  }
  // 한 달에 여럿이 떠나도 알림 창은 하나 — 백 명이 떠나는 달에 창을 백 번 닫게 하지 않는다
  if (defectors.length > 0) pushEvent(state, { kind: 'defected', heroId: defectors[0], heroes: defectors })
}

// ── 달마다 일어나는 일 ──

function monthlyEvents(state: GameState, roster: Roster): void {
  const player = state.playerFaction ? state.factions[state.playerFaction] : null
  const { month } = calendarOf(state.turn)
  if (player && player.alive) {
    const lands = territoriesOf(state, PLAYER_ID)
    if (month === 9 && lands.length > 0) pushLog(state, 'harvest', {}, true)
    // 재해와 축제 — 한 달에 하나
    if (lands.length > 0 && chance(state, 0.12)) {
      const t = pick(state, lands)
      const roll = randInt(state, 0, 5)
      if (roll === 0) { const loss = Math.round(player.food * 0.15); player.food -= loss; pushLog(state, 'drought', { at: t.id, amount: loss }, true) }
      else if (roll === 1) { t.farm = Math.max(0, t.farm - 30); pushLog(state, 'flood', { at: t.id, amount: 30 }, true) }
      else if (roll === 2) { t.population = Math.round(t.population * 0.96); t.order = Math.max(0, t.order - 5); pushLog(state, 'plague', { at: t.id }, true) }
      else if (roll === 3) { const loss = Math.round(player.food * 0.1); player.food -= loss; pushLog(state, 'locusts', { at: t.id, amount: loss }, true) }
      else if (roll === 4) { t.order = Math.min(100, t.order + 8); addFame(state, PLAYER_ID, 2); pushLog(state, 'festival', { at: t.id }, true) }
      else { player.food += 150; pushLog(state, 'bumper', { at: t.id, amount: 150 }, true) }
    }
    // 찾아오는 재야 인재 — 주막이 있으면 더 자주
    const tavern = lands.find((t) => hasBuilding(t, 'tavern'))
    if (lands.length > 0 && !state.events.some((e) => !e.resolved && e.kind === 'visitor') && chance(state, tavern ? 0.2 : 0.08)) {
      const at = tavern ?? lands.find((t) => t.id === player.capital) ?? lands[0]
      const pool: typeof roster.heroes = []
      for (const t of Object.values(state.territories)) {
        if (t.owner && t.owner !== PLAYER_ID) continue
        for (const h of freeHeroesAt(state, roster, t.id)) {
          if (GRADE_INFO[h.grade].fameReq <= player.fame + 60) pool.push(h)
        }
      }
      const visitor = pickWeighted(state, pool, (h) => 0.2 + h.renown)
      if (visitor) pushEvent(state, { kind: 'visitor', heroId: visitor.id, territory: at.id })
    }
    // 충성이 흔들리는 무장
    for (const hs of membersOf(state, PLAYER_ID)) {
      if (hs.status !== 'officer' || hs.loyalty >= 35) continue
      if (state.events.some((e) => e.kind === 'discontent' && e.heroId === hs.id && state.turn - e.turn < 6)) continue
      pushEvent(state, { kind: 'discontent', heroId: hs.id })
      break
    }
    // 108성 집결
    if (state.stats.stars108 === null && activeStars(state, PLAYER_ID).length >= STAR_COUNT) {
      state.stats.stars108 = state.turn
      pushEvent(state, { kind: 'stars108' })
      pushLog(state, 'stars108', {}, true)
    }
    // 명성 칭호
    const rank = fameRank(player.fame)
    if (rank > state.stats.fameRank) {
      state.stats.fameRank = rank
      pushLog(state, 'fame_rank', { rank, fame: FAME_RANKS[rank] }, true)
    }
    state.stats.maxTerritories = Math.max(state.stats.maxTerritories, lands.length)
  }
}

function resetMonth(state: GameState): void {
  for (const hs of Object.values(state.heroes)) {
    hs.acted = false
    hs.task = null
  }
  for (const f of Object.values(state.factions)) {
    for (const [other, treaty] of Object.entries(f.treaties)) {
      if (treaty.until < state.turn) {
        delete f.treaties[other]
        if (f.isPlayer) pushLog(state, 'treaty_end', { faction: other, kind: treaty.kind }, true)
      }
    }
  }
  // 오래된 사건 기록은 정리한다
  state.events = state.events.filter((e) => !e.resolved || state.turn - e.turn < 12)
}

/** 세상이 한 달 흐른다(방랑 중에도 부른다) */
export function worldTick(state: GameState, roster: Roster): void {
  // 기록 칸이 가득 차면 앞에서 잘려 나가므로 길이 대신 마지막 기록을 표지로 삼는다
  const lastBefore = state.log.length > 0 ? state.log[state.log.length - 1] : null
  const aiOrder = shuffleInPlace(state, Object.values(state.factions).filter((f) => f.alive && !f.isPlayer).map((f) => f.id))
  for (const id of aiOrder) aiTurn(state, roster, id)
  aiRelations(state)
  const ledger = runEconomy(state, roster)
  updateTerritories(state, roster)
  updateHeroes(state, roster)
  monthlyEvents(state, roster)
  state.turn += 1
  resetMonth(state)
  state.phase = state.wander ? 'wander' : 'strategy'
  // 판정(끝났으면 phase가 result로 바뀐다)
  checkOutcome(state)
  const logStart = lastBefore ? state.log.lastIndexOf(lastBefore) + 1 : 0
  state.report = {
    turn: state.turn - 1,
    income: ledger?.income ?? { gold: 0, food: 0 },
    expense: ledger?.expense ?? { gold: 0, food: 0 },
    entries: state.log.slice(logStart).filter((e) => e.mine),
  }
}

/** 플레이어가 턴을 마친다 */
export function endTurn(prev: GameState, roster: Roster): GameState {
  if (prev.outcome || prev.battle || prev.phase !== 'strategy') return prev
  if (pendingBlocking(prev).length > 0) return prev
  const state = structuredClone(prev)
  runDelegation(state, roster, PLAYER_ID)
  worldTick(state, roster)
  return state
}
