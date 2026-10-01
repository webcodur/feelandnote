// 천도 v2 — 합전(合戰). 6대6, 전열·후열 3칸씩. 병력이 곧 체력이고 속도가 행동 순서를 정한다.

import { BATTLE, CLASSES, DUEL, NATIVE_DEFENDER, SKILL_POWER, SKILL_TARGET, STARS_BONUS, TERRITORY_PRESET } from './constants'
import { TERRITORY_BY_ID, type TerritoryId } from './map'
import { clamp } from './mutate'
import { freeHeroesAt, heroMaxTroops, officersAt, PLAYER_ID } from './query'
import { chance, pick, rand } from './rng'
import { attackRating, defenseRating, troopFactor } from './power'
import { levelMultiplier, maxTroopsOf } from './roster'
import type {
  BattleAction, BattleSide, BattleState, BattleUnit, DuelMove, DuelState, GameState, Hero, HeroState, Roster, SkillId, UnitStats,
} from './types'

type Rng = { rngState: number }

// ── 부대 만들기 ──

function statsOf(hero: Hero): UnitStats {
  const s = hero.stats
  return {
    command: s.command, martial: s.martial, intellect: s.intellect, charm: s.charm,
    courage: s.courage, benevolence: s.benevolence, cautious_bold: s.cautious_bold,
  }
}

function speedOf(stats: UnitStats, cls: keyof typeof CLASSES, level: number): number {
  return 10 + stats.martial * 0.06 + stats.intellect * 0.02 + CLASSES[cls].speed + level * 0.3
}

export function unitFromHero(hero: Hero, hs: HeroState, side: BattleSide, state: GameState, isLord: boolean): BattleUnit {
  const stats = statsOf(hero)
  const maxTroops = heroMaxTroops(hero, hs, state)
  return {
    heroId: hero.id,
    militia: false,
    side,
    cls: hero.cls,
    grade: hero.grade,
    level: hs.level,
    stats,
    skill: CLASSES[hero.cls].skills[0],
    row: CLASSES[hero.cls].row,
    col: 0,
    troops: Math.max(1, hs.troops),
    maxTroops,
    startTroops: Math.max(1, hs.troops),
    training: hs.training,
    wound: hs.wound,
    next: 0,
    speed: speedOf(stats, hero.cls, hs.level),
    cooldown: 1,
    statuses: {},
    routed: false,
    dealt: 0,
    isLord,
  }
}

/** 주인 없는 땅의 향병 부대 */
function militiaUnit(territory: TerritoryId, index: number, troops: number, side: BattleSide): BattleUnit {
  const cls = index % 3 === 2 ? 'ranger' : 'general'
  const stats: UnitStats = { command: 44, martial: 46, intellect: 38, charm: 40, courage: 60, benevolence: 50, cautious_bold: 0 }
  return {
    heroId: `militia:${territory}:${index}`,
    militia: true,
    side,
    cls,
    grade: 'D',
    level: 1,
    stats,
    skill: CLASSES[cls].skills[0],
    row: CLASSES[cls].row,
    col: 0,
    troops,
    maxTroops: troops,
    startTroops: troops,
    training: 30,
    wound: 0,
    next: 0,
    speed: speedOf(stats, cls, 1),
    cooldown: 2,
    statuses: {},
    routed: false,
    dealt: 0,
    isLord: false,
  }
}

/** 전열 3칸·후열 3칸에 병과 기본 열을 따라 앉힌다. 넘치면 다른 열로 보낸다 */
export function arrangeFormation(units: BattleUnit[]): void {
  for (const side of ['attacker', 'defender'] as BattleSide[]) {
    const list = units.filter((u) => u.side === side)
    const rows: BattleUnit[][] = [[], []]
    const sorted = list.slice().sort((a, b) => b.troops - a.troops)
    for (const u of sorted) {
      const want = CLASSES[u.cls].row
      if (rows[want].length < 3) rows[want].push(u)
      else rows[1 - want].push(u)
    }
    // 전열이 비면 후열의 가장 튼튼한 부대를 앞으로
    if (rows[0].length === 0 && rows[1].length > 0) rows[0].push(rows[1].shift()!)
    rows.forEach((row, r) => row.forEach((u, c) => { u.row = r as 0 | 1; u.col = c as 0 | 1 | 2 }))
  }
}

export interface BattleSetup {
  territory: TerritoryId
  from: TerritoryId | null
  attacker: string | null
  defender: string | null
  attackerIds: string[]
  defenderIds?: string[]
  playerSide: BattleSide | null
  kind: 'invasion' | 'bandits'
  /** 산적 같은 이름 없는 적의 병력 */
  banditTroops?: number
}

/** 주인 없는 땅의 토박이 인재가 이끌고 나오는 병력 */
export function nativeDefenderTroops(hero: Hero): number {
  return Math.round(maxTroopsOf(hero, 1) * NATIVE_DEFENDER.troopRate)
}

/** 주인 없는 땅의 향병 — 싸움에 져서 줄었어도 기본의 4할은 다시 모인다 */
export function nativeMilitia(territory: TerritoryId, current: number): number {
  const preset = TERRITORY_PRESET[TERRITORY_BY_ID[territory].size]
  return Math.max(current, Math.round(preset.militia * 0.4))
}

/** 수비군 고르기 — 영토에 머무는 무장, 주인 없는 땅이면 토박이 인재와 향병 */
export function pickDefenders(state: GameState, roster: Roster, territory: TerritoryId, defender: string | null): string[] {
  if (defender) {
    return officersAt(state, territory, defender)
      .filter((h) => h.troops >= BATTLE.minTroopsToFight || h.status === 'lord')
      .map((h) => ({ h, hero: roster.byId.get(h.id)! }))
      .filter((x) => x.hero)
      .sort((a, b) => b.h.troops * (0.5 + b.hero.score / 100) - a.h.troops * (0.5 + a.hero.score / 100))
      .slice(0, BATTLE.maxUnits)
      .map((x) => x.h.id)
  }
  // 토박이 인재 가운데 무력·통솔이 높은 이가 향병을 이끈다(큰 고을일수록 여럿).
  // 잠시 머무는 떠돌이는 남의 고을을 지키러 나서지 않는다
  return freeHeroesAt(state, roster, territory)
    .filter((h) => h.home === territory && h.stats.martial + h.stats.command >= NATIVE_DEFENDER.minPower)
    .sort((a, b) => (b.stats.martial + b.stats.command) - (a.stats.martial + a.stats.command))
    .slice(0, NATIVE_DEFENDER.count[TERRITORY_BY_ID[territory].size])
    .map((h) => h.id)
}

export function createBattle(state: GameState, roster: Roster, setup: BattleSetup): BattleState {
  const units: BattleUnit[] = []
  const lordOf = (factionId: string | null) => (factionId ? state.factions[factionId]?.lordId : null)
  for (const id of setup.attackerIds.slice(0, BATTLE.maxUnits)) {
    const hero = roster.byId.get(id)
    const hs = state.heroes[id]
    if (hero && hs) units.push(unitFromHero(hero, hs, 'attacker', state, lordOf(setup.attacker) === id))
  }
  const t = state.territories[setup.territory]
  if (setup.kind === 'bandits') {
    const total = setup.banditTroops ?? 1500
    const n = Math.min(4, Math.max(2, Math.round(total / 700)))
    for (let i = 0; i < n; i++) units.push(militiaUnit(setup.territory, i, Math.round(total / n), 'defender'))
  } else {
    const defenderIds = setup.defenderIds ?? pickDefenders(state, roster, setup.territory, setup.defender)
    for (const id of defenderIds) {
      const hero = roster.byId.get(id)
      if (!hero) continue
      let hs = state.heroes[id]
      if (!hs) {
        // 재야 토박이는 향병을 이끌고 나선다
        hs = {
          id, status: 'free', faction: null, loc: setup.territory, troops: 0, training: 30, loyalty: 50,
          wound: 0, xp: 0, level: 1, acted: false, task: null, star: null, joinedTurn: 0,
        }
      }
      const unit = unitFromHero(hero, hs, 'defender', state, lordOf(setup.defender) === id)
      if (!setup.defender) {
        unit.troops = nativeDefenderTroops(hero)
        unit.startTroops = unit.troops
      }
      units.push(unit)
    }
    if (!setup.defender) {
      const militia = nativeMilitia(setup.territory, t.militia)
      const defenders = units.filter((u) => u.side === 'defender').length
      const slots = Math.max(1, Math.min(BATTLE.maxUnits - defenders, Math.ceil(militia / NATIVE_DEFENDER.militiaPerUnit)))
      for (let i = 0; i < slots; i++) units.push(militiaUnit(setup.territory, i, Math.round(militia / slots), 'defender'))
    }
  }
  arrangeFormation(units)
  const moraleOf = (side: BattleSide) => {
    const factionId = side === 'attacker' ? setup.attacker : setup.defender
    const f = factionId ? state.factions[factionId] : null
    const lead = units.filter((u) => u.side === side).sort((a, b) => b.stats.charm - a.stats.charm)[0]
    // 108성이 모인 플레이어 군은 사기가 높은 채로 싸움을 연다
    const stars = f?.isPlayer && state.stats.stars108 !== null ? STARS_BONUS.morale : 0
    const base = BATTLE.startMorale + ((lead?.stats.charm ?? 50) - 50) * 0.2 + (f ? f.fame / 100 : 0) + stars
    return Math.round(clamp(base + (side === 'defender' && t.walls > 300 ? 4 : 0), 30, 95))
  }
  const battle: BattleState = {
    id: ++state.battleSeq,
    territory: setup.territory,
    from: setup.from,
    attacker: setup.attacker,
    defender: setup.defender,
    playerSide: setup.playerSide,
    units,
    round: 1,
    maxRounds: BATTLE.maxRounds,
    morale: { attacker: moraleOf('attacker'), defender: moraleOf('defender') },
    walls: setup.kind === 'invasion' ? t.walls : 0,
    log: [],
    fx: null,
    fxSeq: 0,
    duel: null,
    result: null,
    captured: [],
    kind: setup.kind,
  }
  // 첫 행동 시각은 속도에 비례해 흩어 둔다
  for (const u of battle.units) u.next = (1000 / u.speed) * (0.3 + rand(state) * 0.7)
  if (units.filter((u) => u.side === 'defender').length === 0) battle.result = 'attacker'
  return battle
}

// ── 판세 읽기 ──

export function living(b: BattleState, side?: BattleSide): BattleUnit[] {
  return b.units.filter((u) => !u.routed && (side === undefined || u.side === side))
}

export function unitById(b: BattleState, heroId: string): BattleUnit | undefined {
  return b.units.find((u) => u.heroId === heroId)
}

const other = (side: BattleSide): BattleSide => (side === 'attacker' ? 'defender' : 'attacker')

export function nextActor(b: BattleState): BattleUnit | null {
  let top: BattleUnit | null = null
  for (const u of b.units) {
    if (u.routed) continue
    if (!top || u.next < top.next) top = u
  }
  return top
}

/** 앞으로 n번의 행동 순서 — 화면 위 시간표 */
export function timeline(b: BattleState, n: number): { heroId: string; side: BattleSide; at: number }[] {
  const sim = living(b).map((u) => ({ heroId: u.heroId, side: u.side, at: u.next, step: 1000 / u.speed }))
  const out: { heroId: string; side: BattleSide; at: number }[] = []
  for (let i = 0; i < n && sim.length > 0; i++) {
    sim.sort((a, b2) => a.at - b2.at)
    const first = sim[0]
    out.push({ heroId: first.heroId, side: first.side, at: first.at })
    first.at += first.step
  }
  return out
}

function frontEmpty(b: BattleState, side: BattleSide): boolean {
  return !b.units.some((u) => u.side === side && !u.routed && u.row === 0)
}

/** 평타가 닿는 적. 궁수와 전열 비운 적은 후열까지 닿는다 */
export function attackTargets(b: BattleState, actor: BattleUnit): BattleUnit[] {
  const enemies = living(b, other(actor.side))
  if (CLASSES[actor.cls].ranged) return enemies
  if (frontEmpty(b, other(actor.side))) return enemies
  return enemies.filter((u) => u.row === 0)
}

export function skillTargets(b: BattleState, actor: BattleUnit, skill: SkillId = actor.skill): BattleUnit[] {
  const kind = SKILL_TARGET[skill]
  if (kind === 'ally') return living(b, actor.side).filter((u) => u.troops < u.maxTroops)
  if (kind === 'allies' || kind === 'self') return [actor]
  if (skill === 'charge') return attackTargets(b, { ...actor, cls: 'general' })
  return living(b, other(actor.side))
}

export function canDuel(b: BattleState, actor: BattleUnit, target: BattleUnit): boolean {
  if (actor.militia || target.militia) return false
  if (actor.stats.martial < DUEL.minMartial) return false
  if (target.row !== 0 && !frontEmpty(b, target.side)) return false
  return target.stats.martial >= 30
}

export function duelTargets(b: BattleState, actor: BattleUnit): BattleUnit[] {
  if (actor.row !== 0) return []
  return living(b, other(actor.side)).filter((t) => canDuel(b, actor, t))
}

// ── 피해 계산 ──

function moraleMod(morale: number): number {
  if (morale >= 80) return 1.1
  if (morale >= 60) return 1
  if (morale >= 40) return 0.9
  if (morale >= 20) return 0.8
  return 0.65
}

function incomingMod(b: BattleState, def: BattleUnit, ignoreWalls: boolean): number {
  let m = 1
  if (def.statuses.guard) m *= BATTLE.guardTaken
  if (def.statuses.fortify) m *= BATTLE.fortifyTaken
  if (!ignoreWalls && def.side === 'defender' && b.walls > 0) m *= 1 - Math.min(BATTLE.wallsMaxReduction, (b.walls / 1000) * BATTLE.wallsMaxReduction)
  return m
}

function physical(b: BattleState, rng: Rng, att: BattleUnit, def: BattleUnit, mult: number, opts: { ranged?: boolean; ignoreWalls?: boolean } = {}): { dmg: number; crit: boolean } {
  const atk = attackRating(att.stats, att.cls)
  const dfn = defenseRating(def.stats, def.cls)
  const fromBack = att.row === 1 && !CLASSES[att.cls].ranged && !opts.ranged ? BATTLE.backRowMelee : 1
  const rangedPenalty = opts.ranged && att.row === 1 ? 0.9 : 1
  const crit = chance(rng, 0.06 + att.stats.martial / 1200)
  let dmg = BATTLE.baseDamage * (atk / dfn) * troopFactor(att.troops) * (0.8 + att.training / 500)
    * moraleMod(b.morale[att.side]) * (1 - att.wound / 250) * levelMultiplier(att.level) * mult
    * fromBack * rangedPenalty * incomingMod(b, def, !!opts.ignoreWalls) * (0.9 + rand(rng) * 0.2)
  if (att.statuses.inspired) dmg *= 1.2
  if (att.statuses.weakened) dmg *= 0.8
  if (crit) dmg *= 1.5
  return { dmg: Math.max(1, Math.round(Math.min(def.troops, dmg))), crit }
}

function stratagem(b: BattleState, rng: Rng, att: BattleUnit, def: BattleUnit, mult: number): number {
  const atk = (att.stats.intellect + 30) / 80
  const resist = (def.stats.intellect * 0.5 + 45) / 80
  const dmg = BATTLE.baseDamage * 1.1 * (atk / resist) * Math.sqrt(troopFactor(att.troops)) * moraleMod(b.morale[att.side])
    * levelMultiplier(att.level) * mult * incomingMod(b, def, false) * (0.9 + rand(rng) * 0.2)
  return Math.max(1, Math.round(Math.min(def.troops, dmg)))
}

function logEvent(b: BattleState, code: string, params: Record<string, string | number>): void {
  b.log.push({ round: b.round, code, params })
  if (b.log.length > 80) b.log.splice(0, b.log.length - 80)
}

function setFx(b: BattleState, fx: Omit<NonNullable<BattleState['fx']>, 'id'>): void {
  b.fx = { ...fx, id: ++b.fxSeq }
}

function hit(b: BattleState, att: BattleUnit | null, def: BattleUnit, dmg: number): void {
  def.troops = Math.max(0, def.troops - dmg)
  if (att) att.dealt += dmg
  if (def.troops <= 0 && !def.routed) rout(b, def)
}

function rout(b: BattleState, u: BattleUnit): void {
  u.routed = true
  u.troops = 0
  b.morale[u.side] = Math.max(0, b.morale[u.side] - BATTLE.routMoraleLoss - (u.isLord ? 15 : 0))
  b.morale[other(u.side)] = Math.min(100, b.morale[other(u.side)] + BATTLE.routMoraleGain)
  logEvent(b, 'rout', { unit: u.heroId })
}

// ── 행동 ──

function tickStatuses(u: BattleUnit): void {
  for (const key of Object.keys(u.statuses) as (keyof BattleUnit['statuses'])[]) {
    const left = (u.statuses[key] ?? 0) - 1
    if (left <= 0) delete u.statuses[key]
    else u.statuses[key] = left
  }
}

function endAction(b: BattleState, actor: BattleUnit): void {
  actor.next += 1000 / actor.speed
  if (actor.cooldown > 0) actor.cooldown -= 1
  const now = nextActor(b)?.next ?? actor.next
  b.round = Math.max(b.round, Math.floor(now / BATTLE.roundLength) + 1)
  checkEnd(b)
}

/** 한 부대의 행동을 실행한다. 일기토를 걸면 결투가 열리고 시간이 멈춘다 */
export function applyAction(b: BattleState, rng: Rng, action: BattleAction): void {
  if (b.result || b.duel) return
  const actor = unitById(b, action.actor)
  if (!actor || actor.routed || nextActor(b)?.heroId !== actor.heroId) return
  // 혼란은 한 번 쉬고 풀린다
  if (actor.statuses.confused) {
    delete actor.statuses.confused
    logEvent(b, 'confused_skip', { unit: actor.heroId })
    setFx(b, { kind: 'miss', actor: actor.heroId, targets: [] })
    tickStatuses(actor)
    endAction(b, actor)
    return
  }
  // 방어 자세는 자기 다음 차례가 오면 풀린다
  delete actor.statuses.guard
  tickStatuses(actor)

  const target = action.target ? unitById(b, action.target) : undefined
  switch (action.kind) {
    case 'attack': {
      if (!target || target.routed || !attackTargets(b, actor).includes(target)) break
      const ranged = CLASSES[actor.cls].ranged
      const { dmg, crit } = physical(b, rng, actor, target, 1, { ranged })
      hit(b, actor, target, dmg)
      logEvent(b, crit ? 'attack_crit' : 'attack', { unit: actor.heroId, target: target.heroId, dmg })
      setFx(b, { kind: crit ? 'crit' : 'hit', actor: actor.heroId, targets: [target.heroId], amount: dmg })
      if (!ranged && !target.routed && actor.row === 0) {
        const counter = Math.round(physical(b, rng, target, actor, BATTLE.counter).dmg)
        hit(b, target, actor, counter)
      }
      break
    }
    case 'skill': {
      if (actor.cooldown > 0) break
      const skill = actor.skill
      const targets = skillTargets(b, actor, skill)
      const one = target && targets.includes(target) ? target : null
      const kind = SKILL_TARGET[skill]
      if ((kind === 'enemy' || kind === 'enemy_row' || kind === 'ally') && !one) break
      actor.cooldown = BATTLE.skillCooldown
      if (skill === 'charge' && one) {
        const { dmg, crit } = physical(b, rng, actor, one, SKILL_POWER.charge)
        hit(b, actor, one, dmg)
        hit(b, null, actor, Math.round(dmg * 0.1))
        logEvent(b, 'skill_hit', { unit: actor.heroId, skill, target: one.heroId, dmg })
        setFx(b, { kind: crit ? 'crit' : 'skill', actor: actor.heroId, targets: [one.heroId], amount: dmg, skill })
      } else if ((skill === 'siege' || skill === 'snipe') && one) {
        const { dmg } = physical(b, rng, actor, one, SKILL_POWER[skill], { ranged: true, ignoreWalls: skill === 'siege' })
        hit(b, actor, one, dmg)
        if (skill === 'siege' && b.walls > 0) b.walls = Math.max(0, b.walls - 40)
        if (skill === 'snipe' && !one.routed && chance(rng, 0.2)) one.statuses.confused = 1
        logEvent(b, 'skill_hit', { unit: actor.heroId, skill, target: one.heroId, dmg })
        setFx(b, { kind: 'skill', actor: actor.heroId, targets: [one.heroId], amount: dmg, skill })
      } else if (skill === 'fire' && one) {
        const row = living(b, one.side).filter((u) => u.row === one.row)
        let total = 0
        for (const u of row) {
          const dmg = stratagem(b, rng, actor, u, SKILL_POWER.fire)
          hit(b, actor, u, dmg)
          total += dmg
        }
        logEvent(b, 'skill_row', { unit: actor.heroId, skill, dmg: total, count: row.length })
        setFx(b, { kind: 'skill', actor: actor.heroId, targets: row.map((u) => u.heroId), amount: total, skill })
      } else if (skill === 'confuse' && one) {
        const p = clamp(0.45 + (actor.stats.intellect - one.stats.intellect) * 0.01, 0.15, 0.9)
        const dmg = stratagem(b, rng, actor, one, SKILL_POWER.confuse)
        hit(b, actor, one, dmg)
        const ok = !one.routed && chance(rng, p)
        if (ok) one.statuses.confused = 1
        logEvent(b, ok ? 'confuse_ok' : 'confuse_fail', { unit: actor.heroId, target: one.heroId, dmg })
        setFx(b, { kind: ok ? 'debuff' : 'skill', actor: actor.heroId, targets: [one.heroId], amount: dmg, skill })
      } else if (skill === 'heal' && one) {
        const amount = Math.min(one.maxTroops - one.troops, Math.round(one.maxTroops * SKILL_POWER.heal * (0.8 + actor.stats.benevolence / 250)))
        one.troops += amount
        logEvent(b, 'heal', { unit: actor.heroId, target: one.heroId, amount })
        setFx(b, { kind: 'heal', actor: actor.heroId, targets: [one.heroId], amount, skill })
      } else if (skill === 'fortify') {
        const allies = living(b, actor.side)
        for (const u of allies) u.statuses.fortify = 2
        logEvent(b, 'fortify', { unit: actor.heroId })
        setFx(b, { kind: 'buff', actor: actor.heroId, targets: allies.map((u) => u.heroId), skill })
      } else if (skill === 'inspire') {
        const gain = Math.round(SKILL_POWER.inspire + actor.stats.charm / 20)
        b.morale[actor.side] = Math.min(100, b.morale[actor.side] + gain)
        const allies = living(b, actor.side)
        for (const u of allies) u.statuses.inspired = 1
        logEvent(b, 'inspire', { unit: actor.heroId, amount: gain })
        setFx(b, { kind: 'buff', actor: actor.heroId, targets: allies.map((u) => u.heroId), amount: gain, skill })
      }
      break
    }
    case 'guard': {
      actor.statuses.guard = 1
      b.morale[actor.side] = Math.min(100, b.morale[actor.side] + 1)
      logEvent(b, 'guard', { unit: actor.heroId })
      setFx(b, { kind: 'guard', actor: actor.heroId, targets: [actor.heroId] })
      break
    }
    case 'duel': {
      if (!target || !duelTargets(b, actor).includes(target)) break
      const playerChallenger = b.playerSide === actor.side
      const playerTarget = b.playerSide === target.side
      // 상대가 받아 줄지 — 플레이어가 받는 쪽이면 화면에서 묻는다
      if (!playerTarget) {
        const accepts = acceptsDuel(rng, actor, target)
        if (!accepts) {
          b.morale[target.side] = Math.max(0, b.morale[target.side] - 10)
          logEvent(b, 'duel_refused', { unit: actor.heroId, target: target.heroId })
          setFx(b, { kind: 'debuff', actor: actor.heroId, targets: [target.heroId] })
          break
        }
      }
      b.duel = startDuel(rng, actor, target, playerChallenger ? 'a' : playerTarget ? 'b' : null)
      logEvent(b, 'duel_start', { unit: actor.heroId, target: target.heroId })
      setFx(b, { kind: 'duel', actor: actor.heroId, targets: [target.heroId] })
      if (!b.duel.player) {
        autoDuel(b, rng)
        b.duel = null
        break
      }
      // 플레이어가 겨루는 결투는 끝날 때까지 시간을 멈춘다. closeDuel이 행동을 마무리한다
      return
    }
    case 'wait':
    default:
      break
  }
  endAction(b, actor)
}

// ── 일기토 ──

export function duelHp(u: BattleUnit): number {
  return Math.round(DUEL.hpBase + u.stats.martial * DUEL.hpMartial + u.stats.courage * DUEL.hpCourage + u.level * DUEL.hpLevel)
}

function duelBase(rng: Rng, u: BattleUnit): number {
  return (DUEL.dmgBase + u.stats.martial * DUEL.dmgMartial + u.level) * (0.85 + rand(rng) * 0.3) * (1 - u.wound / 300)
}

function chooseDuelMove(rng: Rng, u: BattleUnit, hpRate: number): DuelMove {
  let atk = 0.45
  let grd = 0.3
  let des = 0.25
  if (u.stats.cautious_bold > 20) { des += 0.1; grd -= 0.05 }
  if (u.stats.cautious_bold < -10) { grd += 0.1; des -= 0.05 }
  if (hpRate < 0.35) { des += 0.15; atk -= 0.1 }
  const roll = rand(rng) * (atk + grd + des)
  if (roll < atk) return 'attack'
  if (roll < atk + grd) return 'guard'
  return 'desperate'
}

function hintFor(rng: Rng, intent: DuelMove): DuelMove {
  if (chance(rng, DUEL.hintTruth)) return intent
  const others: DuelMove[] = (['attack', 'guard', 'desperate'] as DuelMove[]).filter((m) => m !== intent)
  return pick(rng, others)
}

export function startDuel(rng: Rng, a: BattleUnit, b: BattleUnit, player: 'a' | 'b' | null): DuelState {
  const hpA = duelHp(a)
  const hpB = duelHp(b)
  const aiUnit = player === 'b' ? a : b
  const intent = chooseDuelMove(rng, aiUnit, 1)
  return {
    a: a.heroId, b: b.heroId, hpA, hpB, maxA: hpA, maxB: hpB, rounds: [],
    intent, hint: hintFor(rng, intent), done: false, winner: null, player,
  }
}

/** 가위바위보 한 판. 공격은 필살을 끊고, 방어는 공격을 받아치며, 필살은 방어를 부순다 */
function resolveMoves(rng: Rng, a: BattleUnit, b: BattleUnit, ma: DuelMove, mb: DuelMove): { dmgA: number; dmgB: number } {
  const ba = duelBase(rng, a)
  const bb = duelBase(rng, b)
  let dmgA = 0
  let dmgB = 0
  const key = `${ma}:${mb}`
  switch (key) {
    case 'attack:attack': dmgA = bb; dmgB = ba; break
    case 'attack:guard': dmgA = bb * DUEL.counter; break
    case 'attack:desperate': dmgB = ba; break
    case 'guard:attack': dmgB = ba * DUEL.counter; break
    case 'guard:guard': break
    case 'guard:desperate': dmgA = bb * DUEL.breakGuard; break
    case 'desperate:attack': dmgA = bb; break
    case 'desperate:guard': dmgB = ba * DUEL.breakGuard; break
    case 'desperate:desperate': dmgA = bb * DUEL.clash; dmgB = ba * DUEL.clash; break
  }
  return { dmgA: Math.round(dmgA), dmgB: Math.round(dmgB) }
}

function finishDuel(b: BattleState, rng: Rng, duel: DuelState): void {
  const ua = unitById(b, duel.a)!
  const ub = unitById(b, duel.b)!
  const rateA = duel.hpA / duel.maxA
  const rateB = duel.hpB / duel.maxB
  duel.done = true
  if (Math.abs(rateA - rateB) < 0.02) {
    duel.winner = null
    logEvent(b, 'duel_draw', { unit: ua.heroId, target: ub.heroId })
  } else {
    const winner = rateA > rateB ? ua : ub
    const loser = winner === ua ? ub : ua
    duel.winner = winner.heroId
    const loss = Math.round(loser.troops * BATTLE.duelTroopLoss)
    loser.wound = Math.min(100, loser.wound + 35)
    hit(b, winner, loser, loss)
    b.morale[winner.side] = Math.min(100, b.morale[winner.side] + BATTLE.duelMorale)
    b.morale[loser.side] = Math.max(0, b.morale[loser.side] - BATTLE.duelMorale)
    logEvent(b, 'duel_win', { unit: winner.heroId, target: loser.heroId, dmg: loss })
    setFx(b, { kind: 'crit', actor: winner.heroId, targets: [loser.heroId], amount: loss })
  }
  void rng
}

/** 플레이어가 고른 수로 일기토 한 판을 겨룬다 */
export function duelRound(b: BattleState, rng: Rng, move: DuelMove): void {
  const duel = b.duel
  if (!duel || duel.done) return
  const ua = unitById(b, duel.a)!
  const ub = unitById(b, duel.b)!
  const ma = duel.player === 'b' ? duel.intent : move
  const mb = duel.player === 'b' ? move : duel.intent
  const { dmgA, dmgB } = resolveMoves(rng, ua, ub, ma, mb)
  duel.hpA = Math.max(0, duel.hpA - dmgA)
  duel.hpB = Math.max(0, duel.hpB - dmgB)
  duel.rounds.push({ a: ma, b: mb, dmgA, dmgB })
  if (duel.hpA <= 0 || duel.hpB <= 0 || duel.rounds.length >= DUEL.maxRounds) {
    finishDuel(b, rng, duel)
    return
  }
  const aiUnit = duel.player === 'b' ? ua : ub
  const aiRate = duel.player === 'b' ? duel.hpA / duel.maxA : duel.hpB / duel.maxB
  duel.intent = chooseDuelMove(rng, aiUnit, aiRate)
  duel.hint = hintFor(rng, duel.intent)
}

/** 적이 청한 일기토를 거절한다 — 받는 쪽 사기가 꺾인다 */
export function refuseDuel(b: BattleState): void {
  const duel = b.duel
  if (!duel || duel.done) return
  const target = unitById(b, duel.b)
  if (target) b.morale[target.side] = Math.max(0, b.morale[target.side] - 10)
  logEvent(b, 'duel_refused', { unit: duel.a, target: duel.b })
  duel.done = true
  duel.winner = null
  closeDuel(b)
}

/** 결투가 끝난 뒤 멈춘 시간을 다시 흐르게 한다 */
export function closeDuel(b: BattleState): void {
  const duel = b.duel
  if (!duel || !duel.done) return
  b.duel = null
  const actor = unitById(b, duel.a)
  if (actor) endAction(b, actor)
}

/** 청을 받은 장수가 일기토에 응하는가 — 무력 차가 크면 대개 물러서지만, 용맹한 이는 받아들인다 */
function acceptsDuel(rng: Rng, challenger: BattleUnit, target: BattleUnit): boolean {
  return target.stats.martial >= challenger.stats.martial - 25 || target.stats.courage >= 72 || chance(rng, 0.25)
}

/**
 * 남은 판을 양쪽 모두 판단에 맡겨 끝낸다. 결투 창은 닫지 않는다.
 * 플레이어가 청을 받은 채 자동 전투로 넘겼다면 받을지부터 AI처럼 정한다.
 */
export function autoDuel(b: BattleState, rng: Rng): void {
  const duel = b.duel
  if (!duel) return
  if (duel.player === 'b' && duel.rounds.length === 0 && !duel.done) {
    const challenger = unitById(b, duel.a)
    const target = unitById(b, duel.b)
    if (challenger && target && !acceptsDuel(rng, challenger, target)) {
      refuseDuel(b)
      return
    }
  }
  const ua = unitById(b, duel.a)!
  const ub = unitById(b, duel.b)!
  let guard = 0
  while (!duel.done && guard++ < DUEL.maxRounds + 1) {
    const ma = chooseDuelMove(rng, ua, duel.hpA / duel.maxA)
    const mb = chooseDuelMove(rng, ub, duel.hpB / duel.maxB)
    const { dmgA, dmgB } = resolveMoves(rng, ua, ub, ma, mb)
    duel.hpA = Math.max(0, duel.hpA - dmgA)
    duel.hpB = Math.max(0, duel.hpB - dmgB)
    duel.rounds.push({ a: ma, b: mb, dmgA, dmgB })
    if (duel.hpA <= 0 || duel.hpB <= 0 || duel.rounds.length >= DUEL.maxRounds) finishDuel(b, rng, duel)
  }
}

// ── AI 판단 ──

export function chooseAction(b: BattleState, rng: Rng, actor: BattleUnit): BattleAction {
  const allies = living(b, actor.side)
  const enemies = living(b, other(actor.side))
  if (actor.cooldown === 0) {
    const skill = actor.skill
    const targets = skillTargets(b, actor, skill)
    if (skill === 'heal') {
      const hurt = targets.filter((u) => u.troops < u.maxTroops * 0.6).sort((x, y) => x.troops / x.maxTroops - y.troops / y.maxTroops)[0]
      if (hurt) return { kind: 'skill', actor: actor.heroId, target: hurt.heroId }
    } else if (skill === 'fortify') {
      if (!allies.some((u) => u.statuses.fortify)) return { kind: 'skill', actor: actor.heroId }
    } else if (skill === 'inspire') {
      if (b.morale[actor.side] < 85) return { kind: 'skill', actor: actor.heroId }
    } else if (skill === 'fire') {
      const rows = [0, 1].map((r) => enemies.filter((u) => u.row === r))
      const best = rows[0].length >= rows[1].length ? rows[0] : rows[1]
      if (best.length > 0) return { kind: 'skill', actor: actor.heroId, target: best[0].heroId }
    } else if (targets.length > 0) {
      const t = targets.slice().sort((x, y) => (skill === 'confuse' ? y.stats.martial - x.stats.martial : x.troops - y.troops))[0]
      return { kind: 'skill', actor: actor.heroId, target: t.heroId }
    }
  }
  const duels = duelTargets(b, actor)
  if (duels.length > 0 && chance(rng, 0.18)) {
    const t = duels.slice().sort((x, y) => x.stats.martial - y.stats.martial)[0]
    if (actor.stats.martial >= t.stats.martial + 8) return { kind: 'duel', actor: actor.heroId, target: t.heroId }
  }
  const targets = attackTargets(b, actor)
  if (targets.length === 0 || (actor.troops < actor.maxTroops * 0.2 && chance(rng, 0.3))) {
    return { kind: 'guard', actor: actor.heroId }
  }
  // 무너지기 직전의 적을 먼저 친다
  const target = targets.slice().sort((x, y) => x.troops - y.troops + (rand(rng) - 0.5) * 400)[0]
  return { kind: 'attack', actor: actor.heroId, target: target.heroId }
}

/** 지금 차례인 부대가 AI 판단으로 움직인다 */
export function stepAuto(b: BattleState, rng: Rng): void {
  if (b.result) return
  if (b.duel) {
    if (b.duel.done) closeDuel(b)
    return
  }
  const actor = nextActor(b)
  if (!actor) { checkEnd(b); return }
  applyAction(b, rng, chooseAction(b, rng, actor))
}

export function isPlayerTurn(b: BattleState): boolean {
  if (b.result || b.duel) return false
  const actor = nextActor(b)
  return !!actor && b.playerSide === actor.side
}

export function checkEnd(b: BattleState): BattleSide | 'draw' | null {
  if (b.result) return b.result
  const a = living(b, 'attacker').length
  const d = living(b, 'defender').length
  if (a === 0 || b.morale.attacker <= 0) b.result = 'defender'
  else if (d === 0 || b.morale.defender <= 0) b.result = 'attacker'
  else if (b.round > b.maxRounds) {
    b.result = siegeVerdict(b)
    logEvent(b, b.result === 'attacker' ? 'siege_fall' : 'siege_hold', {})
  }
  if (b.result) logEvent(b, 'battle_end', { result: b.result })
  return b.result
}

/** 제한 합이 끝나도 두 진영이 서 있으면 — 공격 쪽이 넉넉히 앞섰을 때만 수비군이 성을 버린다 */
function siegeVerdict(b: BattleState): BattleSide {
  const troops = (side: BattleSide) => living(b, side).reduce((sum, u) => sum + u.troops, 0)
  return troops('attacker') > troops('defender') * BATTLE.siegeTakeRatio ? 'attacker' : 'defender'
}

/** 끝날 때까지 AI끼리 싸운다(위임·AI 전투) */
export function autoResolve(b: BattleState, rng: Rng): void {
  let guard = 0
  while (!b.result && guard++ < 600) {
    if (b.duel) {
      autoDuel(b, rng)
      closeDuel(b)
      continue
    }
    stepAuto(b, rng)
  }
  if (!b.result) b.result = 'defender'
}

/** 부대 자리 바꾸기(전투 시작 전) */
export function swapPositions(b: BattleState, heroId: string, row: 0 | 1, col: 0 | 1 | 2): void {
  const u = unitById(b, heroId)
  if (!u) return
  const occupant = b.units.find((x) => x.side === u.side && x.row === row && x.col === col && x !== u)
  if (occupant) { occupant.row = u.row; occupant.col = u.col }
  u.row = row
  u.col = col
}

/** 퇴각 — 물러난 쪽이 진다 */
export function retreat(b: BattleState, side: BattleSide): void {
  if (b.result) return
  b.duel = null
  b.morale[side] = 0
  b.result = other(side)
  logEvent(b, 'battle_end', { result: b.result })
}

export function isPlayerBattle(b: BattleState): boolean {
  return b.attacker === PLAYER_ID || b.defender === PLAYER_ID
}

/** 이 부대가 지금 쓸 수 있는 행동 */
export function availableActions(b: BattleState, actor: BattleUnit): { attack: BattleUnit[]; skill: BattleUnit[]; skillReady: boolean; duel: BattleUnit[] } {
  return {
    attack: attackTargets(b, actor),
    skill: skillTargets(b, actor),
    skillReady: actor.cooldown === 0,
    duel: duelTargets(b, actor),
  }
}
