// 천도 v2 — 무장 명령. 플레이어와 AI가 같은 함수를 쓴다(초안 상태를 제자리에서 바꾼다).

import {
  BUILDING_EFFECT, BUILDINGS, CLASS_DEV_BONUS, COMMANDS, DEV_MAX, ECONOMY, FAME_GAIN, GRADE_INFO, LOYALTY, RECRUIT, SEARCH, TROOPS,
} from './constants'
import { foodTrend } from './economy'
import { isAdjacent, type TerritoryId } from './map'
import { addFame, clamp, ensureHero, fixGovernor, gainXp, joinFaction, pushLog, releaseHero } from './mutate'
import {
  canBuildHere, freeHeroesAt, hasBuilding, heroMaxTroops, marchableNeighbors, PLAYER_ID,
} from './query'
import { chance, pickWeighted, rand } from './rng'
import { levelMultiplier, sameEra } from './roster'
import type { BuildingType, GameState, Hero, HeroState, OfficerTask, Roster } from './types'

export type DevTask = 'farm' | 'commerce' | 'walls' | 'relief' | 'conscript' | 'train' | 'subdue'

export type Command =
  | { kind: DevTask; heroId: string }
  | { kind: 'search'; heroId: string }
  | { kind: 'recruit'; heroId: string; target: string }
  | { kind: 'move'; heroId: string; to: TerritoryId }
  | { kind: 'build'; heroId: string; building: BuildingType }
  | { kind: 'reward'; target: string }
  | { kind: 'dismiss'; target: string }
  | { kind: 'governor'; territory: TerritoryId; target: string }
  | { kind: 'delegate'; territory: TerritoryId; on: boolean }

export interface CommandResult {
  ok: boolean
  code: string
  params?: Record<string, string | number>
  found?: string[]
  heroId?: string
}

const fail = (code: string, params?: CommandResult['params']): CommandResult => ({ ok: false, code, params })

function devBonus(hero: Hero, task: keyof NonNullable<(typeof CLASS_DEV_BONUS)[keyof typeof CLASS_DEV_BONUS]>): number {
  return CLASS_DEV_BONUS[hero.cls]?.[task] ?? 1
}

function wobble(state: GameState): number {
  return 0.9 + rand(state) * 0.2
}

/** 명령을 받을 수 있는 무장인지 */
function readyOfficer(state: GameState, roster: Roster, factionId: string, heroId: string): { hs: HeroState; hero: Hero } | CommandResult {
  const hs = state.heroes[heroId]
  const hero = roster.byId.get(heroId)
  if (!hs || !hero || hs.faction !== factionId || (hs.status !== 'officer' && hs.status !== 'lord')) return fail('not_officer')
  if (hs.acted) return fail('already_acted', { hero: heroId })
  if (state.territories[hs.loc].owner !== factionId) return fail('not_own_territory')
  return { hs, hero }
}

function pay(state: GameState, factionId: string, gold: number, food: number): boolean {
  const f = state.factions[factionId]
  if (f.gold < gold || f.food < food) return false
  f.gold -= gold
  f.food -= food
  return true
}

function finish(state: GameState, hs: HeroState, task: OfficerTask, xp: number): void {
  hs.acted = true
  hs.task = task
  gainXp(state, hs, xp)
}

/** 등용 확률(0~1) — 화면이 미리 보여 줄 때도 쓴다 */
export function recruitChance(state: GameState, roster: Roster, factionId: string, recruiter: Hero, target: Hero): number {
  const f = state.factions[factionId]
  const lord = roster.byId.get(f.lordId)
  let p = RECRUIT.base
    + (recruiter.stats.charm - 50) * RECRUIT.charm
    + (f.fame / 1000) * RECRUIT.fame
    - GRADE_INFO[target.grade].recruitResist
  if (lord && lord.nat === target.nat) p += RECRUIT.sameNation
  if (recruiter.prof === target.prof) p += RECRUIT.sameProfession
  if (lord && sameEra(lord, target)) p += RECRUIT.sameEra
  if (lord && lord.stats.benevolence >= 75) p += 0.04
  return clamp(p, RECRUIT.min, RECRUIT.max)
}

export function canRecruitByFame(state: GameState, factionId: string, target: Hero): boolean {
  return state.factions[factionId].fame >= GRADE_INFO[target.grade].fameReq
}

export function searchChance(state: GameState, hero: Hero, territory: TerritoryId): number {
  const t = state.territories[territory]
  const p = (SEARCH.base + hero.stats.intellect * SEARCH.intellect + hero.stats.charm * SEARCH.charm) * devBonus(hero, 'search')
    + (hasBuilding(t, 'tavern') ? SEARCH.tavern : 0)
  return clamp(p, 0.05, SEARCH.max)
}

export function subdueChance(state: GameState, hero: Hero, hs: HeroState): number {
  const threat = state.territories[hs.loc].threat
  if (!threat) return 0
  const s = hero.stats
  const p = threat.type === 'plague'
    ? 0.35 + s.intellect * 0.003 + s.benevolence * 0.003
    : 0.35 + s.martial * 0.004 + s.command * 0.002 + hs.troops / 6000
  return clamp(p - threat.power * 0.05, 0.08, 0.95)
}

/** 명령을 맡겼을 때 기대되는 오름폭(난수 없이). 화면이 무장을 고를 때 보여 준다 */
export function previewGain(state: GameState, roster: Roster, heroId: string, kind: DevTask): number {
  const hs = state.heroes[heroId]
  const hero = roster.byId.get(heroId)
  if (!hs || !hero) return 0
  const s = hero.stats
  const t = state.territories[hs.loc]
  const lv = levelMultiplier(hs.level)
  switch (kind) {
    case 'farm': return Math.max(1, Math.round((6 + s.command * 0.18) * devBonus(hero, 'farm') * lv))
    case 'commerce': return Math.max(1, Math.round((6 + s.charm * 0.12 + s.intellect * 0.06) * devBonus(hero, 'commerce') * lv))
    case 'walls': return Math.max(1, Math.round((5 + s.command * 0.1 + s.martial * 0.08) * devBonus(hero, 'walls') * lv))
    case 'relief': return Math.max(1, Math.round((4 + s.charm * 0.06 + s.benevolence * 0.04) * devBonus(hero, 'relief') * lv))
    case 'conscript': {
      const max = heroMaxTroops(hero, hs, state)
      const barracks = hasBuilding(t, 'barracks') ? BUILDING_EFFECT.barracksConscript : 1
      return Math.max(0, Math.min(max - hs.troops, Math.round((TROOPS.conscriptBase + s.command * TROOPS.conscriptCommand) * barracks)))
    }
    case 'train': return Math.max(1, Math.min(100 - hs.training, Math.round((8 + s.command * 0.08) * devBonus(hero, 'train'))))
    case 'subdue': return Math.round(subdueChance(state, hero, hs) * 100)
  }
}

/** 명령 하나를 실행한다 */
export function runCommand(state: GameState, roster: Roster, factionId: string, cmd: Command): CommandResult {
  const f = state.factions[factionId]
  if (!f || !f.alive) return fail('no_faction')
  const mine = factionId === PLAYER_ID

  switch (cmd.kind) {
    case 'farm':
    case 'commerce':
    case 'walls': {
      const ready = readyOfficer(state, roster, factionId, cmd.heroId)
      if ('ok' in ready) return ready
      const { hs, hero } = ready
      const def = COMMANDS[cmd.kind]
      const t = state.territories[hs.loc]
      const cap = cmd.kind === 'walls' && hasBuilding(t, 'fortress') ? DEV_MAX + BUILDING_EFFECT.fortressWalls : DEV_MAX
      if (t[cmd.kind] >= cap) return fail('dev_max')
      if (!pay(state, factionId, def.gold, def.food)) return fail('not_enough_gold')
      const s = hero.stats
      const raw = cmd.kind === 'farm'
        ? 6 + s.command * 0.18
        : cmd.kind === 'commerce'
          ? 6 + s.charm * 0.12 + s.intellect * 0.06
          : 5 + s.command * 0.1 + s.martial * 0.08
      const gain = Math.max(1, Math.round(raw * devBonus(hero, cmd.kind) * levelMultiplier(hs.level) * wobble(state)))
      t[cmd.kind] = Math.min(cap, t[cmd.kind] + gain)
      finish(state, hs, cmd.kind, def.xp)
      return { ok: true, code: `${cmd.kind}_done`, params: { hero: hero.id, gain, at: t.id }, heroId: hero.id }
    }
    case 'relief': {
      const ready = readyOfficer(state, roster, factionId, cmd.heroId)
      if ('ok' in ready) return ready
      const { hs, hero } = ready
      const t = state.territories[hs.loc]
      if (t.order >= 100) return fail('order_max')
      if (!pay(state, factionId, 0, COMMANDS.relief.food)) return fail('not_enough_food')
      const gain = Math.max(1, Math.round((4 + hero.stats.charm * 0.06 + hero.stats.benevolence * 0.04)
        * devBonus(hero, 'relief') * levelMultiplier(hs.level) * wobble(state)))
      t.order = Math.min(100, t.order + gain)
      finish(state, hs, 'relief', COMMANDS.relief.xp)
      return { ok: true, code: 'relief_done', params: { hero: hero.id, gain, at: t.id }, heroId: hero.id }
    }
    case 'conscript': {
      const ready = readyOfficer(state, roster, factionId, cmd.heroId)
      if ('ok' in ready) return ready
      const { hs, hero } = ready
      const t = state.territories[hs.loc]
      const max = heroMaxTroops(hero, hs, state)
      if (hs.troops >= max) return fail('troops_full')
      if (t.population < 20000) return fail('population_low')
      if (!pay(state, factionId, COMMANDS.conscript.gold, 0)) return fail('not_enough_gold')
      const barracks = hasBuilding(t, 'barracks') ? BUILDING_EFFECT.barracksConscript : 1
      const add = Math.min(max - hs.troops, Math.round((TROOPS.conscriptBase + hero.stats.command * TROOPS.conscriptCommand) * barracks * wobble(state)))
      hs.troops += add
      t.population = Math.max(10000, t.population - add)
      t.order = Math.max(0, t.order - (hero.stats.charm >= 70 ? 1 : 2))
      hs.training = Math.max(0, Math.round(hs.training * (hs.troops - add) / Math.max(1, hs.troops)))
      finish(state, hs, 'conscript', COMMANDS.conscript.xp)
      return { ok: true, code: 'conscript_done', params: { hero: hero.id, gain: add, at: t.id }, heroId: hero.id }
    }
    case 'train': {
      const ready = readyOfficer(state, roster, factionId, cmd.heroId)
      if ('ok' in ready) return ready
      const { hs, hero } = ready
      if (hs.training >= 100) return fail('training_max')
      if (hs.troops <= 0) return fail('no_troops')
      const gain = Math.max(1, Math.round((8 + hero.stats.command * 0.08) * devBonus(hero, 'train') * wobble(state)))
      hs.training = Math.min(100, hs.training + gain)
      finish(state, hs, 'train', COMMANDS.train.xp)
      return { ok: true, code: 'train_done', params: { hero: hero.id, gain }, heroId: hero.id }
    }
    case 'subdue': {
      const ready = readyOfficer(state, roster, factionId, cmd.heroId)
      if ('ok' in ready) return ready
      const { hs, hero } = ready
      const t = state.territories[hs.loc]
      if (!t.threat) return fail('no_threat')
      if (!pay(state, factionId, 0, COMMANDS.subdue.food)) return fail('not_enough_food')
      const p = subdueChance(state, hero, hs)
      const type = t.threat.type
      finish(state, hs, 'subdue', COMMANDS.subdue.xp)
      if (chance(state, p)) {
        t.threat = null
        t.order = Math.min(100, t.order + 4)
        addFame(state, factionId, 3)
        pushLog(state, 'subdue_ok', { hero: hero.id, at: t.id, threat: type }, mine)
        return { ok: true, code: 'subdue_ok', params: { hero: hero.id, threat: type }, heroId: hero.id }
      }
      if (type !== 'plague') {
        hs.wound = Math.min(100, hs.wound + 15)
        hs.troops = Math.round(hs.troops * 0.9)
      }
      pushLog(state, 'subdue_fail', { hero: hero.id, at: t.id, threat: type }, mine)
      return { ok: true, code: 'subdue_fail', params: { hero: hero.id, threat: type }, heroId: hero.id }
    }
    case 'search': {
      const ready = readyOfficer(state, roster, factionId, cmd.heroId)
      if ('ok' in ready) return ready
      const { hs, hero } = ready
      const t = state.territories[hs.loc]
      const pool = freeHeroesAt(state, roster, t.id).filter((h) => f.discovered[h.id] === undefined)
      if (pool.length === 0) {
        finish(state, hs, 'search', 4)
        return { ok: true, code: 'search_exhausted', params: { hero: hero.id, at: t.id }, heroId: hero.id, found: [] }
      }
      if (!pay(state, factionId, COMMANDS.search.gold, 0)) return fail('not_enough_gold')
      finish(state, hs, 'search', COMMANDS.search.xp)
      const found: string[] = []
      if (chance(state, searchChance(state, hero, t.id))) {
        const tries = chance(state, SEARCH.extraFind) ? 2 : 1
        for (let i = 0; i < tries; i++) {
          const left = pool.filter((h) => !found.includes(h.id))
          const pickHero = pickWeighted(state, left, (h) => 0.35 + h.renown)
          if (!pickHero) break
          found.push(pickHero.id)
          f.discovered[pickHero.id] = state.turn
        }
      }
      let gold = 0
      if (chance(state, SEARCH.goldFind)) {
        gold = 30 + Math.round(rand(state) * 60)
        f.gold += gold
      }
      if (found.length === 0) {
        return { ok: true, code: gold ? 'search_gold' : 'search_none', params: { hero: hero.id, at: t.id, gold }, heroId: hero.id, found }
      }
      pushLog(state, 'search_found', { hero: hero.id, at: t.id, found: found.length }, mine)
      return { ok: true, code: 'search_found', params: { hero: hero.id, at: t.id, gold }, heroId: hero.id, found }
    }
    case 'recruit': {
      const ready = readyOfficer(state, roster, factionId, cmd.heroId)
      if ('ok' in ready) return ready
      const { hs, hero } = ready
      const target = roster.byId.get(cmd.target)
      if (!target) return fail('no_target')
      const ts = state.heroes[target.id]
      const loc = ts ? ts.loc : target.home
      const isFree = !ts || ts.status === 'free'
      if (!isFree) return fail('target_not_free')
      if (loc !== hs.loc) return fail('target_elsewhere')
      if (f.discovered[target.id] === undefined) return fail('target_unknown')
      if (f.discovered[target.id] > state.turn) return fail('target_cooldown', { turns: f.discovered[target.id] - state.turn })
      if (!canRecruitByFame(state, factionId, target)) return fail('fame_low', { need: GRADE_INFO[target.grade].fameReq })
      if (!pay(state, factionId, COMMANDS.recruit.gold, 0)) return fail('not_enough_gold')
      const p = recruitChance(state, roster, factionId, hero, target)
      finish(state, hs, 'recruit', COMMANDS.recruit.xp)
      if (chance(state, p)) {
        joinFaction(state, roster, target, factionId, { loc: hs.loc, troopRate: 0.3 })
        if (mine) state.stats.recruited += 1
        if (target.grade === 'SS' || target.grade === 'S') addFame(state, factionId, FAME_GAIN.recruitTop)
        pushLog(state, 'recruit_ok', { hero: hero.id, target: target.id, at: hs.loc }, mine)
        return { ok: true, code: 'recruit_ok', params: { hero: hero.id, target: target.id }, heroId: target.id }
      }
      f.discovered[target.id] = state.turn + RECRUIT.cooldown
      return { ok: true, code: 'recruit_fail', params: { hero: hero.id, target: target.id }, heroId: target.id }
    }
    case 'move': {
      const ready = readyOfficer(state, roster, factionId, cmd.heroId)
      if ('ok' in ready) return ready
      const { hs, hero } = ready
      const to = state.territories[cmd.to]
      if (to.owner !== factionId) return fail('not_own_territory')
      if (!isAdjacent(hs.loc, cmd.to)) return fail('not_adjacent')
      if (!marchableNeighbors(state, hs.loc).includes(cmd.to)) return fail('need_shipyard')
      const from = hs.loc
      hs.loc = cmd.to
      finish(state, hs, 'move', COMMANDS.move.xp)
      fixGovernor(state, roster, from)
      fixGovernor(state, roster, cmd.to)
      return { ok: true, code: 'move_done', params: { hero: hero.id, from, to: cmd.to }, heroId: hero.id }
    }
    case 'build': {
      const ready = readyOfficer(state, roster, factionId, cmd.heroId)
      if ('ok' in ready) return ready
      const { hs, hero } = ready
      const t = state.territories[hs.loc]
      if (!canBuildHere(t, cmd.building)) return fail('cannot_build')
      const def = BUILDINGS[cmd.building]
      if (!pay(state, factionId, def.gold, 0)) return fail('not_enough_gold')
      const months = Math.max(1, def.months - (hero.cls === 'artisan' ? 1 : 0))
      t.buildings.push({ type: cmd.building, progress: months })
      finish(state, hs, 'build', COMMANDS.build.xp)
      return { ok: true, code: 'build_started', params: { hero: hero.id, building: cmd.building, months, at: t.id }, heroId: hero.id }
    }
    case 'reward': {
      const hs = state.heroes[cmd.target]
      if (!hs || hs.faction !== factionId || hs.status !== 'officer') return fail('not_officer')
      if (hs.loyalty >= 100) return fail('loyalty_max')
      if (!pay(state, factionId, LOYALTY.rewardGold, 0)) return fail('not_enough_gold')
      const lord = roster.byId.get(f.lordId)
      const gain = LOYALTY.rewardGain + Math.round((lord?.stats.charm ?? 50) / 25)
      hs.loyalty = Math.min(100, hs.loyalty + gain)
      return { ok: true, code: 'reward_done', params: { hero: cmd.target, gain }, heroId: cmd.target }
    }
    case 'dismiss': {
      const hs = state.heroes[cmd.target]
      const hero = roster.byId.get(cmd.target)
      if (!hs || !hero || hs.faction !== factionId || hs.status !== 'officer') return fail('not_officer')
      releaseHero(state, hero)
      fixGovernor(state, roster, hs.loc)
      pushLog(state, 'dismissed', { hero: hero.id }, mine)
      return { ok: true, code: 'dismissed', params: { hero: hero.id } }
    }
    case 'governor': {
      const t = state.territories[cmd.territory]
      const hs = state.heroes[cmd.target]
      if (t.owner !== factionId || !hs || hs.faction !== factionId || hs.loc !== t.id) return fail('not_officer')
      t.governor = hs.id
      return { ok: true, code: 'governor_set', params: { hero: hs.id, at: t.id } }
    }
    case 'delegate': {
      const t = state.territories[cmd.territory]
      if (t.owner !== factionId) return fail('not_own_territory')
      t.delegate = cmd.on
      return { ok: true, code: cmd.on ? 'delegate_on' : 'delegate_off', params: { at: t.id } }
    }
  }
}

// ── 자동 명령(위임·AI) ──

interface AutoOptions {
  /** 이번 달 남은 등용·탐색 횟수(AI만). 없으면 인재 일은 맡기지 않는다 */
  talent?: { recruits: number; searches: number }
  /** 남겨 둘 금 */
  reserve: number
}

function best<T>(list: T[], score: (item: T) => number): T | null {
  let top: T | null = null
  let topScore = -Infinity
  for (const item of list) {
    const s = score(item)
    if (s > topScore) { topScore = s; top = item }
  }
  return top
}

/** 영토 하나의 대기 무장에게 알맞은 일을 나눠 준다 */
export function autoCommandTerritory(state: GameState, roster: Roster, factionId: string, territory: TerritoryId, opts: AutoOptions): number {
  const f = state.factions[factionId]
  const t = state.territories[territory]
  let issued = 0
  const idle = () => Object.values(state.heroes)
    .filter((h) => h.faction === factionId && h.loc === territory && !h.acted && (h.status === 'officer' || h.status === 'lord'))
    .map((hs) => ({ hs, hero: roster.byId.get(hs.id)! }))
    .filter((x) => x.hero)
  const issue = (cmd: Command) => {
    const r = runCommand(state, roster, factionId, cmd)
    if (r.ok) issued++
    return r.ok
  }
  const frontier = Object.values(state.territories).some((n) => n.owner !== factionId && isAdjacent(n.id, territory))

  // 1) 위협 진압
  if (t.threat) {
    const pick = best(idle(), ({ hero, hs }) => (t.threat?.type === 'plague' ? hero.stats.intellect + hero.stats.benevolence : hero.stats.martial * 1.5 + hs.troops / 100))
    if (pick && f.food > 100) issue({ kind: 'subdue', heroId: pick.hs.id })
  }
  // 2) 민심 수습
  if (t.order < 45 && f.food > 300) {
    const pick = best(idle(), ({ hero }) => hero.stats.charm + hero.stats.benevolence)
    if (pick) issue({ kind: 'relief', heroId: pick.hs.id })
  }
  // 3) 인재 — AI만, 세력마다 달마다 정해진 횟수 안에서
  const talent = opts.talent
  if (talent) {
    const candidates = freeHeroesAt(state, roster, territory)
    const known = candidates.filter((h) => f.discovered[h.id] !== undefined && f.discovered[h.id] <= state.turn && canRecruitByFame(state, factionId, h))
    for (const target of known.sort((a, b) => b.score - a.score)) {
      if (talent.recruits <= 0 || f.gold < opts.reserve + 60) break
      const pick = best(idle(), ({ hero }) => hero.stats.charm)
      if (!pick) break
      talent.recruits -= 1
      issue({ kind: 'recruit', heroId: pick.hs.id, target: target.id })
    }
    const undiscovered = candidates.some((h) => f.discovered[h.id] === undefined)
    if (undiscovered && talent.searches > 0 && f.gold > opts.reserve + 40) {
      const pick = best(idle(), ({ hero }) => hero.stats.intellect + hero.stats.charm * 0.5)
      if (pick) {
        talent.searches -= 1
        issue({ kind: 'search', heroId: pick.hs.id })
      }
    }
  }
  // 4) 병력 — 전선이면 징병과 훈련. 금이 모자라므로 잘 싸우는 무장부터 채운다.
  //    군량 추세가 모자라면 더 뽑지 않는다(비축이 두 해를 못 버틸 만큼 적자가 나면 멈춘다)
  let foodRoom = foodTrend(state, roster, factionId) + f.food / 24
  const fighters = idle().sort((a, b) => (b.hero.stats.command + b.hero.stats.martial) - (a.hero.stats.command + a.hero.stats.martial))
  for (const { hs, hero } of fighters) {
    const max = heroMaxTroops(hero, hs, state)
    const add = previewGain(state, roster, hs.id, 'conscript')
    if (frontier && hs.troops < max * 0.7 && f.gold > opts.reserve + 150 && t.population > 30000 && foodRoom - add / 100 * ECONOMY.foodPer100Troops > 0) {
      if (issue({ kind: 'conscript', heroId: hs.id })) foodRoom -= (add / 100) * ECONOMY.foodPer100Troops
    } else if (frontier && hs.troops > 300 && hs.training < 60 && hero.stats.command >= 55) {
      issue({ kind: 'train', heroId: hs.id })
    }
  }
  // 5) 개발 — 가장 모자란 쪽부터
  for (const { hs, hero } of idle()) {
    if (f.gold < opts.reserve + 70) break
    const wallsCap = hasBuilding(t, 'fortress') ? DEV_MAX + BUILDING_EFFECT.fortressWalls : DEV_MAX
    const options: { kind: 'farm' | 'commerce' | 'walls'; need: number }[] = [
      { kind: 'farm', need: (DEV_MAX - t.farm) * (hero.stats.command / 60) },
      { kind: 'commerce', need: (DEV_MAX - t.commerce) * ((hero.stats.charm + hero.stats.intellect) / 130) },
      { kind: 'walls', need: (wallsCap - t.walls) * (frontier ? 0.9 : 0.35) * (hero.stats.command / 70) },
    ]
    const pick = best(options.filter((o) => t[o.kind] < (o.kind === 'walls' ? wallsCap : DEV_MAX)), (o) => o.need)
    if (pick) issue({ kind: pick.kind, heroId: hs.id })
  }
  // 6) 남은 무장은 훈련
  for (const { hs } of idle()) {
    if (hs.troops > 200 && hs.training < 100) issue({ kind: 'train', heroId: hs.id })
  }
  return issued
}

/** 플레이어 위임 영토 전체 */
export function runDelegation(state: GameState, roster: Roster, factionId: string): number {
  let issued = 0
  for (const t of Object.values(state.territories)) {
    if (t.owner !== factionId || !t.delegate) continue
    issued += autoCommandTerritory(state, roster, factionId, t.id, { reserve: 150 })
  }
  return issued
}

/** 영토 안 무장이 아니라 세력 전체로 본 명령 가능 무장 수 */
export function countIdle(state: GameState, factionId: string): number {
  return Object.values(state.heroes).filter((h) => h.faction === factionId && !h.acted && (h.status === 'officer' || h.status === 'lord')).length
}

export { ensureHero }
