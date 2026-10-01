// 천도 v2 — 경제 셈: 영토 수입, 세력 수지, 한 해 평균 군량 흐름.
// 달 넘기기(turn)와 자동 명령(commands)이 함께 쓰므로 둘 어느 쪽에도 기대지 않는다.

import { BUILDING_EFFECT, calendarOf, DIFFICULTY, ECONOMY, GRADE_INFO, STARS_BONUS } from './constants'
import { hasBuilding, membersOf, territoriesOf } from './query'
import type { GameState, Roster, TerritoryState } from './types'

/** 계절을 고르게 편 한 해 평균 배율 */
const SEASON_AVERAGE = Object.values(ECONOMY.seasonFood).reduce((a, b) => a + b, 0) / Object.values(ECONOMY.seasonFood).length

export function territoryIncome(state: GameState, t: TerritoryState, opts: { seasonless?: boolean } = {}): { gold: number; food: number } {
  if (!t.owner) return { gold: 0, food: 0 }
  const f = state.factions[t.owner]
  const { season } = calendarOf(state.turn)
  const orderMod = ECONOMY.orderBase + (t.order / 100) * ECONOMY.orderSpan
  const threat = t.threat ? 0.85 : 1
  const aiBonus = f && !f.isPlayer ? DIFFICULTY[state.difficulty].aiBonus : 1
  const stars = f?.isPlayer && state.stats.stars108 !== null ? STARS_BONUS.income : 1
  const pop = t.population / 1000
  const seasonMod = opts.seasonless ? SEASON_AVERAGE : ECONOMY.seasonFood[season]
  const gold = (t.commerce * ECONOMY.goldPerCommerce + pop * ECONOMY.goldPerThousandPop)
    * orderMod * threat * aiBonus * stars * (hasBuilding(t, 'market') ? 1 + BUILDING_EFFECT.market : 1)
  const food = (t.farm * ECONOMY.foodPerFarm + pop * ECONOMY.foodPerThousandPop)
    * orderMod * threat * aiBonus * stars * seasonMod * (hasBuilding(t, 'farmland') ? 1 + BUILDING_EFFECT.farmland : 1)
  return { gold: Math.round(gold), food: Math.round(food) }
}

export interface FactionLedger {
  income: { gold: number; food: number }
  expense: { gold: number; food: number }
}

export function factionLedger(state: GameState, roster: Roster, factionId: string, opts: { seasonless?: boolean } = {}): FactionLedger {
  const income = { gold: 0, food: 0 }
  for (const t of territoriesOf(state, factionId)) {
    const i = territoryIncome(state, t, opts)
    income.gold += i.gold
    income.food += i.food
  }
  const expense = { gold: 0, food: 0 }
  for (const hs of membersOf(state, factionId)) {
    const hero = roster.byId.get(hs.id)
    if (hero && hs.status === 'officer') expense.gold += GRADE_INFO[hero.grade].salary
    expense.food += Math.round((hs.troops / 100) * ECONOMY.foodPer100Troops)
  }
  return { income, expense }
}

/** 군량이 바닥날 때 상인에게 사들이는 값(군량 1당 금) — 시장이 있으면 덜 비싸다 */
export function foodBuyPrice(state: GameState, factionId: string): number {
  return territoriesOf(state, factionId).some((t) => hasBuilding(t, 'market')) ? ECONOMY.foodBuyPriceMarket : ECONOMY.foodBuyPrice
}

/**
 * 이 달을 넘기면 군량이 모자라 금으로 사들이게 될 몫(금).
 * 수입·지출표에는 없는 돈이라, 윗줄 금 증감에 넣지 않으면 금이 새는데도 늘어나는 것처럼 보인다.
 */
export function foodPurchaseCost(state: GameState, ledger: FactionLedger, factionId: string): number {
  const f = state.factions[factionId]
  if (!f) return 0
  const foodAfter = f.food + ledger.income.food - ledger.expense.food
  if (foodAfter >= 0) return 0
  const goldAfter = f.gold + ledger.income.gold - ledger.expense.gold
  return Math.max(0, Math.min(Math.ceil(-foodAfter * foodBuyPrice(state, factionId)), goldAfter))
}

/** 한 해 평균으로 본 달 군량 수지 — 가을걷이 전후로 출렁이는 값을 고르게 편다 */
export function foodTrend(state: GameState, roster: Roster, factionId: string): number {
  const l = factionLedger(state, roster, factionId, { seasonless: true })
  return l.income.food - l.expense.food
}

/**
 * 군량 형편 — 한 해 평균으로 본다.
 * ok: 모자라지 않는다 / buying: 모자란 몫을 금으로 사들여도 금이 버틴다(달마다 드는 금) /
 * danger: 군량과 금이 다 떨어져 병사가 흩어지기까지 남은 달.
 * 금으로 버티는데도 「군량 0달치」라고 겁주지 않도록 금고까지 함께 셈한다.
 */
export type FoodOutlook = { kind: 'ok' } | { kind: 'buying'; goldPerMonth: number } | { kind: 'danger'; months: number }

export function foodOutlook(state: GameState, roster: Roster, factionId: string): FoodOutlook {
  const f = state.factions[factionId]
  if (!f) return { kind: 'ok' }
  const l = factionLedger(state, roster, factionId, { seasonless: true })
  const deficit = l.expense.food - l.income.food
  if (deficit <= 0) return { kind: 'ok' }
  const buyCost = deficit * foodBuyPrice(state, factionId)
  const goldNet = l.income.gold - l.expense.gold
  if (goldNet >= buyCost) return { kind: 'buying', goldPerMonth: Math.round(buyCost) }
  // 쌓아 둔 군량을 먼저 먹고, 그 뒤로는 금고를 헐어 사들인다
  const foodMonths = f.food / deficit
  const goldWhenFoodGone = Math.max(0, f.gold + goldNet * foodMonths)
  const months = Math.floor(foodMonths + goldWhenFoodGone / (buyCost - goldNet))
  return { kind: 'danger', months: Math.max(0, months) }
}
