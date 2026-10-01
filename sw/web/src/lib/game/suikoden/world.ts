// 천도 v2 — 새 천하 만들기. 공개 인물 전원이 고향 영토에 선 채로 판이 열린다.

import {
  CAPITAL_EXTRA_SLOTS, DIFFICULTY, FACTION_COLORS, PLAYER_COLOR, START, START_ORDER, TAG_BONUS, TERRITORY_PRESET, DEV_MAX,
} from './constants'
import { TERRITORIES, TERRITORY_BY_ID, type TerritoryId } from './map'
import { fixGovernor, joinFaction, pushLog } from './mutate'
import { heroMaxTroops, PLAYER_ID } from './query'
import { chance, randInt, rand } from './rng'
import { lordScore } from './roster'
import type {
  AIPersonality, Difficulty, FactionState, GameState, Hero, Roster, TerritoryState,
} from './types'

export interface NewGameOptions {
  lordId: string
  difficulty: Difficulty
  seed?: number
}

export function personalityOf(hero: Hero): AIPersonality {
  const s = hero.stats
  const top = Math.max(s.command, s.martial, s.intellect, s.charm)
  if (s.cautious_bold >= 25 || s.martial >= 80) return 'conqueror'
  if (s.intellect === top && s.intellect >= 70) return 'schemer'
  if (s.benevolence >= 75) return 'benevolent'
  if (s.cautious_bold <= -10) return 'cautious'
  return 'builder'
}

const PERSONALITIES: AIPersonality[] = ['conqueror', 'schemer', 'benevolent', 'cautious', 'builder']

/** 성향마다 두드러지는 기질 — 군주들끼리 견주는 데만 쓰므로 척도는 대략이면 된다 */
const TEMPER_KEY: Record<AIPersonality, (h: Hero) => number> = {
  conqueror: (h) => h.stats.martial + h.stats.cautious_bold * 1.2 + h.stats.courage * 0.3,
  schemer: (h) => h.stats.intellect - h.stats.fairness * 0.4 + h.stats.reflection * 0.2,
  benevolent: (h) => h.stats.benevolence + h.stats.charm * 0.5 + h.stats.fairness * 0.3,
  cautious: (h) => -h.stats.cautious_bold * 1.2 + h.stats.temperance * 0.5 + h.stats.intellect * 0.2,
  builder: (h) => h.stats.diligence + h.stats.command * 0.5 + h.stats.conservative_progressive * 0.3,
}

/**
 * AI 군주 성향 나누기. 이름난 군주는 대개 무력이 높아 절대 기준으로는 모두 정복형이 되므로,
 * 군주들 사이에서 가장 두드러지는 기질을 고르고 한 성향이 3분의 1을 넘지 않게 한다.
 */
export function assignPersonalities(lords: Hero[]): Map<string, AIPersonality> {
  const result = new Map<string, AIPersonality>()
  if (lords.length === 0) return result
  const rank = new Map<AIPersonality, Map<string, number>>()
  for (const p of PERSONALITIES) {
    const sorted = [...lords].sort((a, b) => TEMPER_KEY[p](b) - TEMPER_KEY[p](a) || a.id.localeCompare(b.id))
    rank.set(p, new Map(sorted.map((h, i) => [h.id, i / Math.max(1, lords.length - 1)])))
  }
  const quota = Math.ceil(lords.length / 3)
  const count = new Map<AIPersonality, number>()
  const pairs = lords
    .flatMap((h) => PERSONALITIES.map((p) => ({ id: h.id, p, r: rank.get(p)!.get(h.id)! })))
    .sort((a, b) => a.r - b.r || PERSONALITIES.indexOf(a.p) - PERSONALITIES.indexOf(b.p))
  for (const { id, p } of pairs) {
    if (result.has(id) || (count.get(p) ?? 0) >= quota) continue
    result.set(id, p)
    count.set(p, (count.get(p) ?? 0) + 1)
  }
  for (const h of lords) if (!result.has(h.id)) result.set(h.id, personalityOf(h))
  return result
}

function makeTerritory(id: TerritoryId): TerritoryState {
  const def = TERRITORY_BY_ID[id]
  const preset = TERRITORY_PRESET[def.size]
  const tag = (name: keyof typeof TAG_BONUS) => (def.tags.includes(name) ? TAG_BONUS[name] : 1)
  return {
    id,
    owner: null,
    governor: null,
    population: preset.population,
    farm: Math.min(DEV_MAX, Math.round(preset.farm * tag('fertile'))),
    commerce: Math.min(DEV_MAX, Math.round(preset.commerce * tag('trade'))),
    walls: Math.min(DEV_MAX, Math.round(preset.walls * tag('fortress'))),
    order: START_ORDER,
    buildings: [],
    slots: preset.slots,
    delegate: false,
    militia: preset.militia,
    threat: null,
  }
}

function makeFaction(id: string, lord: Hero, capital: TerritoryId, color: string, isPlayer: boolean, bonus: number): FactionState {
  return {
    id,
    lordId: lord.id,
    color,
    capital,
    gold: Math.round(START.aiGold * bonus),
    food: Math.round(START.aiFood * bonus),
    fame: START.fameByGrade[lord.grade],
    isPlayer,
    personality: isPlayer ? 'builder' : personalityOf(lord),
    relations: {},
    treaties: {},
    discovered: {},
    alive: true,
    stars: [],
    fallenTurn: null,
    foundedTurn: 0,
    lastSortie: -99,
  }
}

/**
 * AI 군주 고르기 — 영토마다 가장 그릇이 큰 토박이를 후보로 세우고,
 * 한 지역에 세력이 몰리지 않게 지역별 상한을 둔 채 강한 순서로 뽑는다.
 */
function pickAiCapitals(roster: Roster, count: number, exclude: Set<string>, playerHome: TerritoryId): { lord: Hero; capital: TerritoryId }[] {
  const candidates: { lord: Hero; capital: TerritoryId; score: number }[] = []
  for (const def of TERRITORIES) {
    if (def.id === playerHome) continue
    const natives = roster.byHome.get(def.id) ?? []
    let best: Hero | null = null
    let bestScore = -1
    for (const hero of natives) {
      if (exclude.has(hero.id)) continue
      if (hero.grade === 'D' || hero.grade === 'E') continue
      const score = lordScore(hero)
      if (score > bestScore) { bestScore = score; best = hero }
    }
    if (best) candidates.push({ lord: best, capital: def.id, score: bestScore })
  }
  candidates.sort((a, b) => b.score - a.score)
  const regionCap = Math.max(2, Math.ceil(count / 6))
  const perRegion = new Map<string, number>()
  const picked: { lord: Hero; capital: TerritoryId }[] = []
  for (const c of candidates) {
    if (picked.length >= count) break
    const region = TERRITORY_BY_ID[c.capital].region
    if ((perRegion.get(region) ?? 0) >= regionCap) continue
    perRegion.set(region, (perRegion.get(region) ?? 0) + 1)
    picked.push({ lord: c.lord, capital: c.capital })
  }
  return picked
}

export function createGame(roster: Roster, opts: NewGameOptions): GameState {
  const lord = roster.byId.get(opts.lordId)
  if (!lord) throw new Error(`lord not in roster: ${opts.lordId}`)
  const diff = DIFFICULTY[opts.difficulty]
  const seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0

  const territories = Object.fromEntries(TERRITORIES.map((t) => [t.id, makeTerritory(t.id)])) as GameState['territories']
  const state: GameState = {
    version: 2,
    seed,
    rngState: seed,
    turn: 0,
    difficulty: opts.difficulty,
    phase: 'wander',
    lordId: lord.id,
    playerFaction: null,
    wander: {
      loc: lord.home,
      party: [],
      gold: diff.wanderGold,
      fame: Math.round(START.fameByGrade[lord.grade] * START.wanderFameRate),
      encounter: null,
      met: [],
      turns: 0,
    },
    territories,
    factions: {},
    heroes: {},
    battle: null,
    battleSeq: 0,
    events: [],
    eventSeq: 0,
    log: [],
    report: null,
    outcome: null,
    stats: { battlesWon: 0, battlesLost: 0, recruited: 0, conquered: 0, maxTerritories: 0, stars108: null, fameRank: 0 },
    settings: { battleSpeed: 1, autoBattle: false },
    rosterSize: roster.heroes.length,
  }

  // 군주는 방랑 중에도 곁의 병사 약간을 거느린다
  state.heroes[lord.id] = {
    id: lord.id, status: 'lord', faction: null, loc: lord.home, troops: 0, training: 30, loyalty: 100,
    wound: 0, xp: 0, level: 1, acted: false, task: null, star: null, joinedTurn: 0,
  }

  // AI 세력
  const exclude = new Set([lord.id])
  const capitals = pickAiCapitals(roster, diff.aiFactions, exclude, lord.home)
  const tempers = assignPersonalities(capitals.map((c) => c.lord))
  capitals.forEach(({ lord: aiLord, capital }, i) => {
    const id = `f${i + 1}`
    const faction = makeFaction(id, aiLord, capital, FACTION_COLORS[i % FACTION_COLORS.length], false, diff.aiBonus)
    faction.personality = tempers.get(aiLord.id) ?? faction.personality
    state.factions[id] = faction
    const t = state.territories[capital]
    t.owner = id
    t.militia = 0
    t.slots += CAPITAL_EXTRA_SLOTS
    joinFaction(state, roster, aiLord, id, { loc: capital, troopRate: START.aiTroopRate, loyalty: 100 })
    exclude.add(aiLord.id)
  })

  // 세력마다 고향 사람을 막료로 거느린다(모자라면 같은 지역에서 데려온다)
  for (const faction of Object.values(state.factions)) {
    const capital = faction.capital
    const want = Math.max(1, diff.aiStartMembers + randInt(state, -1, 1))
    const pool = (roster.byHome.get(capital) ?? []).filter((h) => !exclude.has(h.id))
    const region = TERRITORY_BY_ID[capital].region
    if (pool.length < want) {
      for (const def of TERRITORIES) {
        if (def.region !== region || def.id === capital) continue
        if (state.territories[def.id].owner) continue
        for (const h of roster.byHome.get(def.id) ?? []) if (!exclude.has(h.id)) pool.push(h)
      }
    }
    // 강한 순서지만 전부 최상위만 데려가지 않도록 섞는다
    const sorted = pool.slice(0, Math.max(want * 4, 8)).sort((a, b) => b.score - a.score + (rand(state) - 0.5) * 12)
    for (const hero of sorted.slice(0, want)) {
      joinFaction(state, roster, hero, faction.id, { loc: capital, troopRate: START.aiTroopRate, loyalty: 70 + randInt(state, 0, 20) })
      exclude.add(hero.id)
    }
  }

  // 플레이어 세력 자리(거병 전에는 비어 있다)
  for (const a of Object.values(state.factions)) {
    for (const b of Object.values(state.factions)) {
      if (a.id === b.id) continue
      if (a.relations[b.id] !== undefined) continue
      const sameRegion = TERRITORY_BY_ID[a.capital].region === TERRITORY_BY_ID[b.capital].region
      const value = randInt(state, -12, 12) - (sameRegion ? 8 : 0)
      a.relations[b.id] = value
      b.relations[a.id] = value
    }
  }

  // 전 인물 중 이름난 떠돌이 몇이 고향을 떠나 있다 — 세상이 조금 섞여 있어야 방랑이 재미있다
  const drifters = roster.heroes.filter((h) => !exclude.has(h.id) && h.renown > 0.55)
  for (const hero of drifters) {
    if (!chance(state, 0.08)) continue
    const target = TERRITORIES[randInt(state, 0, TERRITORIES.length - 1)].id
    if (target === hero.home) continue
    state.heroes[hero.id] = {
      id: hero.id, status: 'free', faction: null, loc: target, troops: 0, training: 0, loyalty: 50,
      wound: 0, xp: 0, level: 1, acted: false, task: null, star: null, joinedTurn: 0,
    }
  }

  pushLog(state, 'wander_start', { hero: lord.id, at: lord.home }, true)
  return state
}

/** 거병 — 방랑 일행이 주인 없는 영토에 깃발을 세운다 */
export function createPlayerFaction(state: GameState, roster: Roster, at: TerritoryId): void {
  const lord = roster.byId.get(state.lordId)
  if (!lord || !state.wander) return
  // 봉기 — 남의 고을이면 그 세력 무장들은 도읍으로 물러난다
  const prevOwner = state.territories[at].owner
  if (prevOwner) {
    const capital = state.factions[prevOwner]?.capital
    for (const hs of Object.values(state.heroes)) {
      if (hs.faction === prevOwner && hs.loc === at && capital && capital !== at) hs.loc = capital
    }
    if (capital) fixGovernor(state, roster, capital)
    pushLog(state, 'uprising', { at, faction: prevOwner }, true)
  }
  const faction = makeFaction(PLAYER_ID, lord, at, PLAYER_COLOR, true, 1)
  faction.foundedTurn = state.turn
  faction.gold = state.wander.gold + START.playerRaiseGold
  faction.food = START.playerRaiseFood
  faction.fame = state.wander.fame
  state.factions[PLAYER_ID] = faction
  state.playerFaction = PLAYER_ID
  for (const other of Object.values(state.factions)) {
    if (other.id === PLAYER_ID) continue
    // 고을을 빼앗긴 세력은 처음부터 원한을 품는다
    const value = other.id === prevOwner ? -40 : randInt(state, -8, 8)
    other.relations[PLAYER_ID] = value
    faction.relations[other.id] = value
  }
  const t = state.territories[at]
  t.owner = PLAYER_ID
  const volunteers = Math.round(t.militia * START.raiseMilitiaRate)
  t.militia = 0
  t.slots += CAPITAL_EXTRA_SLOTS
  t.delegate = false
  const joined = [joinFaction(state, roster, lord, PLAYER_ID, { loc: at, troopRate: START.raiseTroopRate, loyalty: 100 })]
  for (const id of state.wander.party) {
    const hero = roster.byId.get(id)
    if (hero) joined.push(joinFaction(state, roster, hero, PLAYER_ID, { loc: at, troopRate: START.raiseTroopRate, companion: true }))
  }
  // 고을 향병이 깃발 아래 모인다 — 빈자리가 많은 부대부터 채운다
  let left = volunteers
  for (let round = 0; round < 3 && left > 0; round++) {
    const open = joined.filter((hs) => hs.troops < heroMaxTroops(roster.byId.get(hs.id)!, hs, state))
    if (open.length === 0) break
    const share = Math.ceil(left / open.length)
    for (const hs of open) {
      const room = heroMaxTroops(roster.byId.get(hs.id)!, hs, state) - hs.troops
      const add = Math.min(room, share, left)
      hs.troops += add
      left -= add
    }
  }
  if (volunteers - left > 0) pushLog(state, 'volunteers', { at, amount: volunteers - left }, true)
  t.governor = lord.id
  // 방랑 중 만난 재야 인물은 이미 아는 사람이다
  for (const id of state.wander.met) {
    const hs = state.heroes[id]
    if (!hs || hs.status === 'free') faction.discovered[id] = state.turn
  }
  state.wander = null
  state.phase = 'strategy'
  for (const hs of Object.values(state.heroes)) if (hs.faction === PLAYER_ID) hs.acted = false
}
