// 천도 v2 — 방랑: 군주 혼자 길을 나서 벗을 모으고 빈 땅에 깃발을 세운다

import { FAME_GAIN, FAME_MAX, GRADE_INFO, WANDER } from './constants'
import { isAdjacent, isSeaRoute, neighborsOf, type TerritoryId } from './map'
import { clamp, pushLog } from './mutate'
import { freeHeroesAt } from './query'
import { chance, pickWeighted, rand, randInt } from './rng'
import { sameEra } from './roster'
import { worldTick } from './turn'
import type { Encounter, EncounterKind, GameState, Hero, Roster } from './types'
import { createPlayerFaction } from './world'

export type WanderChoice =
  | 'invite' | 'talk' | 'leave'          // 인물
  | 'fight' | 'pay' | 'flee'             // 산적
  | 'escort' | 'decline'                 // 상인
  | 'help'                               // 마을
  | 'rest' | 'divine'                   // 사당 — 기도·점
  | 'ok'                                 // 소문·고요

export function wanderRecruitChance(state: GameState, roster: Roster, hero: Hero): number {
  const w = state.wander
  const lord = roster.byId.get(state.lordId)
  if (!w || !lord) return 0
  let p = WANDER.recruitBase + lord.stats.charm * WANDER.recruitCharm + w.fame * WANDER.recruitFame - GRADE_INFO[hero.grade].wanderResist
  if (lord.nat === hero.nat) p += 0.1
  if (lord.prof === hero.prof) p += 0.05
  if (sameEra(lord, hero)) p += 0.05
  return clamp(p, WANDER.recruitMin, WANDER.recruitMax)
}

/** 일행의 싸움 기세 — 군주와 길동무의 무력·통솔 */
export function partyPower(state: GameState, roster: Roster): number {
  const w = state.wander
  if (!w) return 0
  const ids = [state.lordId, ...w.party]
  return Math.round(ids.reduce((sum, id) => {
    const h = roster.byId.get(id)
    return sum + (h ? h.stats.martial * 0.6 + h.stats.command * 0.4 : 0)
  }, 0))
}

/** 이 기세의 적과 맞붙어 이길 확률 — 일행 기세에 0.75~1.25 사이의 운이 곱해진다 */
export function banditWinChance(state: GameState, roster: Roster, power: number): number {
  const mine = partyPower(state, roster)
  if (mine <= 0) return 0
  return clamp(1 - (power / mine - 0.75) / 0.5, 0, 1)
}

/** 아직 만나지 못한 이 땅의 재야 인물 */
export function unmetLocals(state: GameState, roster: Roster, at: TerritoryId): Hero[] {
  const w = state.wander
  if (!w) return []
  return freeHeroesAt(state, roster, at).filter((h) => !w.met.includes(h.id) && h.id !== state.lordId && !w.party.includes(h.id))
}

/** 여기와 이웃 땅에서 아직 못 만난 이름난 인물 하나 — 소문·점괘가 가리킨다 */
function pickLead(state: GameState, roster: Roster): { heroId: string; at: TerritoryId } | null {
  const w = state.wander!
  const candidates: { hero: Hero; at: TerritoryId }[] = []
  for (const at of [w.loc, ...neighborsOf(w.loc).map((x) => x.id)]) {
    for (const h of unmetLocals(state, roster, at)) if (h.grade === 'SS' || h.grade === 'S' || h.grade === 'A') candidates.push({ hero: h, at })
  }
  const pickd = pickWeighted(state, candidates, (c) => 0.2 + c.hero.renown)
  return pickd ? { heroId: pickd.hero.id, at: pickd.at } : null
}

function rollEncounter(state: GameState, roster: Roster): Encounter {
  const w = state.wander!
  const locals = unmetLocals(state, roster, w.loc)
  // 소문으로 찾아온 땅이면 그 사람을 반드시 만난다
  if (w.lead && w.lead.at === w.loc) {
    const lead = locals.find((h) => h.id === w.lead!.heroId)
    w.lead = null
    if (lead) {
      w.met.push(lead.id)
      return { kind: 'hero', heroId: lead.id, resolved: false }
    }
  }
  const table = WANDER.encounter
  const kinds = Object.keys(table) as EncounterKind[]
  let kind = pickWeighted(state, kinds, (k) => table[k as keyof typeof table]) ?? 'quiet'
  if (kind === 'hero' && locals.length === 0) kind = 'village'
  if (kind === 'hero') {
    const hero = pickWeighted(state, locals, (h) => (0.3 + h.renown) * (h.grade === 'SS' ? 0.5 : h.grade === 'S' ? 0.7 : 1))!
    w.met.push(hero.id)
    return { kind, heroId: hero.id, resolved: false }
  }
  if (kind === 'bandits') return { kind, power: Math.round(60 + w.turns * 3 + rand(state) * 70), gold: randInt(state, ...WANDER.banditGold), resolved: false }
  if (kind === 'merchant') return { kind, gold: randInt(state, ...WANDER.merchantGold), power: Math.round(60 + w.turns * 3 + rand(state) * 70), resolved: false }
  if (kind === 'rumor') {
    const lead = pickLead(state, roster)
    if (lead) {
      w.lead = lead
      return { kind, rumorHeroId: lead.heroId, rumorAt: lead.at, resolved: false }
    }
    return { kind: 'quiet', resolved: false }
  }
  return { kind, resolved: false }
}

function afterMonth(state: GameState, roster: Roster): void {
  const w = state.wander!
  w.turns += 1
  worldTick(state, roster)
  if (state.wander) state.wander.encounter = rollEncounter(state, roster)
}

/** 이웃 영토로 떠난다(한 달). 바닷길은 뱃삯이 든다 */
export function wanderMove(prev: GameState, roster: Roster, to: TerritoryId): GameState {
  const w0 = prev.wander
  if (!w0 || !isAdjacent(w0.loc, to)) return prev
  const sea = isSeaRoute(w0.loc, to)
  if (sea && w0.gold < WANDER.seaFare) return prev
  const state = structuredClone(prev)
  const w = state.wander!
  if (sea) w.gold -= WANDER.seaFare
  const from = w.loc
  w.loc = to
  const lord = state.heroes[state.lordId]
  if (lord) lord.loc = to
  pushLog(state, 'wander_move', { from, to }, true)
  afterMonth(state, roster)
  return state
}

/** 머문 곳을 수소문한다(한 달) */
export function wanderSearch(prev: GameState, roster: Roster): GameState {
  if (!prev.wander) return prev
  const state = structuredClone(prev)
  afterMonth(state, roster)
  return state
}

export function wanderResolve(prev: GameState, roster: Roster, choice: WanderChoice): GameState {
  const e0 = prev.wander?.encounter
  if (!e0 || e0.resolved) return prev
  const state = structuredClone(prev)
  const w = state.wander!
  const e = w.encounter!
  e.resolved = true
  const hero = e.heroId ? roster.byId.get(e.heroId) : undefined
  switch (e.kind) {
    case 'hero': {
      if (!hero) break
      if (choice === 'invite') {
        if (w.party.length >= WANDER.partyMax) { e.result = 'refused'; break }
        if (chance(state, wanderRecruitChance(state, roster, hero))) {
          w.party.push(hero.id)
          state.heroes[hero.id] = {
            id: hero.id, status: 'companion', faction: null, loc: w.loc, troops: 0, training: 20, loyalty: 80,
            wound: 0, xp: 0, level: 1, acted: false, task: null, star: null, joinedTurn: state.turn,
          }
          e.result = 'joined'
          pushLog(state, 'wander_joined', { hero: hero.id }, true)
        } else {
          e.result = 'refused'
          w.fame = Math.min(FAME_MAX, w.fame + 1)
        }
      } else if (choice === 'talk') {
        w.fame = Math.min(FAME_MAX, w.fame + FAME_GAIN.wanderTalk)
        e.result = 'talked'
      } else {
        e.result = 'ignored'
      }
      break
    }
    case 'bandits': {
      const power = e.power ?? 100
      if (choice === 'pay') {
        const loss = Math.min(w.gold, e.gold ?? 50)
        w.gold -= loss
        e.result = 'paid'
        break
      }
      if (choice === 'flee' && chance(state, WANDER.flee)) { e.result = 'fled'; break }
      if (chance(state, banditWinChance(state, roster, power))) {
        w.gold += e.gold ?? 40
        w.fame = Math.min(FAME_MAX, w.fame + FAME_GAIN.wanderBandits)
        e.result = 'won'
      } else {
        e.loss = Math.min(w.gold, Math.round((e.gold ?? 40) * WANDER.banditLossMult))
        w.gold -= e.loss
        e.result = 'lost'
      }
      break
    }
    case 'merchant': {
      if (choice !== 'escort') { e.result = 'ignored'; break }
      // 호위 길에 도적이 덮칠 수 있다 — 일행이 약하면 품삯은커녕 제 돈까지 털린다
      if (!chance(state, WANDER.escortAmbush)) { w.gold += e.gold ?? 60; e.result = 'helped'; break }
      if (chance(state, banditWinChance(state, roster, e.power ?? 100))) {
        w.gold += e.gold ?? 60
        w.fame = Math.min(FAME_MAX, w.fame + FAME_GAIN.wanderBandits)
        e.result = 'defended'
      } else {
        e.loss = Math.min(w.gold, Math.round((e.gold ?? 60) * WANDER.escortLossMult))
        w.gold -= e.loss
        e.result = 'robbed'
      }
      break
    }
    case 'village':
      if (choice === 'help' && w.gold >= WANDER.villageGold) { w.gold -= WANDER.villageGold; w.fame = Math.min(FAME_MAX, w.fame + FAME_GAIN.wanderVillage); e.result = 'helped' } else e.result = 'ignored'
      break
    case 'shrine': {
      // 점을 치면 금을 내고 이름난 인물의 자리를 알고, 기도만 하면 이름이 조금 난다
      if (choice === 'divine' && w.gold >= WANDER.shrineGold) {
        w.gold -= WANDER.shrineGold
        const lead = pickLead(state, roster)
        if (lead) {
          w.lead = lead
          e.rumorHeroId = lead.heroId
          e.rumorAt = lead.at
          e.result = 'foretold'
          break
        }
      }
      w.fame = Math.min(FAME_MAX, w.fame + WANDER.shrineFame)
      e.result = 'rested'
      break
    }
    default:
      e.result = 'ignored'
  }
  return state
}

/** 동료와 헤어진다 */
export function wanderPart(prev: GameState, heroId: string): GameState {
  if (!prev.wander || !prev.wander.party.includes(heroId)) return prev
  const state = structuredClone(prev)
  const w = state.wander!
  w.party = w.party.filter((id) => id !== heroId)
  const hs = state.heroes[heroId]
  if (hs) { hs.status = 'free'; hs.loc = w.loc }
  return state
}

export function canRaiseHere(state: GameState): { ok: boolean; code: string } {
  const w = state.wander
  if (!w) return { ok: false, code: 'not_wandering' }
  const t = state.territories[w.loc]
  if (!t.owner) return { ok: true, code: 'ok' }
  // 천하에 빈 땅이 하나도 남지 않았으면 도읍이 아닌 고을에서 봉기할 수 있다(오래 떠돌다 설 자리를 잃지 않게)
  const anyEmpty = Object.values(state.territories).some((x) => !x.owner)
  if (!anyEmpty && state.factions[t.owner]?.capital !== t.id) return { ok: true, code: 'uprising' }
  return { ok: false, code: anyEmpty ? 'occupied' : 'capital' }
}

/** 거병 — 이 달의 전략 국면이 곧바로 열린다 */
export function wanderRaise(prev: GameState, roster: Roster): GameState {
  if (!canRaiseHere(prev).ok) return prev
  const state = structuredClone(prev)
  const at = state.wander!.loc
  createPlayerFaction(state, roster, at)
  state.factions.player.fame = Math.min(FAME_MAX, state.factions.player.fame + FAME_GAIN.raise)
  pushLog(state, 'raise', { hero: state.lordId, at }, true)
  return state
}
