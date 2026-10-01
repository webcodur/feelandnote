// 천도 v2 — AI 군주의 한 달: 출진 판단 → 무장 재배치 → 내정·인재 → 시설 → 외교

import { nativeDefenderTroops, nativeMilitia, pickDefenders } from './battle'
import { autoCommandTerritory } from './commands'
import { AI_AGGRESSION, AI_WAR, BATTLE, BUILDINGS, DIFFICULTY, DIPLOMACY, NATIVE_DEFENDER } from './constants'
import { attackRatio, combatValue, sideStrength, strengthValue, type PowerUnit, type SideStrength } from './power'
import { neighborsOf, TERRITORY_BY_ID, type TerritoryId } from './map'
import { clamp, fixGovernor, pushEvent } from './mutate'
import {
  canBuildHere, isAlliedOrTruce, marchableNeighbors, membersOf, officersAt, PLAYER_ID, territoriesOf, factionPower,
} from './query'
import { chance } from './rng'
import type { AIPersonality, BuildingType, GameState, HeroState, Roster } from './types'
import { checkAttack, launchAiAttack } from './war'

/** 부대 하나의 싸움 값 — 출진 부대를 고르는 순서에 쓴다 */
export function unitPower(state: GameState, roster: Roster, hs: HeroState): number {
  const hero = roster.byId.get(hs.id)
  if (!hero) return 0
  return combatValue(hero.stats, hero.cls, hs.troops, hs.training, hs.wound, hs.level)
}

function powerUnitOf(roster: Roster, hs: HeroState): PowerUnit | null {
  const hero = roster.byId.get(hs.id)
  if (!hero) return null
  return { stats: hero.stats, cls: hero.cls, troops: hs.troops, training: hs.training, wound: hs.wound, level: hs.level }
}

/** 출진할 부대 묶음의 힘 */
export function armyStrength(state: GameState, roster: Roster, army: HeroState[]): SideStrength {
  return sideStrength(army.slice(0, BATTLE.maxUnits).map((hs) => powerUnitOf(roster, hs)).filter((u): u is PowerUnit => !!u))
}

/** 화면용 한 숫자 */
export function armyPower(state: GameState, roster: Roster, army: HeroState[]): number {
  return strengthValue(armyStrength(state, roster, army))
}

/** 향병 부대 능력 — 합전의 향병 부대와 같다 */
const MILITIA_STATS = { command: 44, martial: 46, intellect: 38, courage: 60 }

/** 화면용 한 숫자 */
export function defensePower(state: GameState, roster: Roster, to: TerritoryId): number {
  return strengthValue(defenseStrength(state, roster, to))
}

/** 이 부대들로 저 땅을 칠 때의 승산 비(1을 넘으면 대개 이긴다) */
export function sortieRatio(state: GameState, roster: Roster, army: HeroState[], to: TerritoryId): number {
  return attackRatio(armyStrength(state, roster, army), defenseStrength(state, roster, to))
}

/** 영토 수비력 — 합전을 열 때 나서는 수비군 그대로 어림한다. AI 판단과 화면의 전력 비교가 함께 쓴다 */
export function defenseStrength(state: GameState, roster: Roster, to: TerritoryId): SideStrength {
  const t = state.territories[to]
  const units: PowerUnit[] = []
  if (t.owner) {
    for (const id of pickDefenders(state, roster, to, t.owner)) {
      const u = state.heroes[id] ? powerUnitOf(roster, state.heroes[id]) : null
      if (u) units.push(u)
    }
  } else {
    const natives = pickDefenders(state, roster, to, null)
    for (const id of natives) {
      const h = roster.byId.get(id)
      if (h) units.push({ stats: h.stats, cls: h.cls, troops: nativeDefenderTroops(h), training: 30, wound: 0, level: 1 })
    }
    const militia = nativeMilitia(to, t.militia)
    const slots = Math.max(1, Math.min(BATTLE.maxUnits - natives.length, Math.ceil(militia / NATIVE_DEFENDER.militiaPerUnit)))
    for (let i = 0; i < slots; i++) {
      units.push({ stats: MILITIA_STATS, cls: i % 3 === 2 ? 'ranger' : 'general', troops: militia / slots, training: 30, wound: 0, level: 1 })
    }
  }
  const s = sideStrength(units, t.walls)
  // 성이 비어 있어도 성벽과 백성이 조금은 버틴다
  return { hold: Math.max(300, s.hold), hit: Math.max(0.3, s.hit) }
}

/** 영토마다 가장 가까운 남의 땅까지 거리 — 병력을 앞으로 모을 때 쓴다 */
function frontierDistance(state: GameState, factionId: string): Map<TerritoryId, number> {
  const dist = new Map<TerritoryId, number>()
  const queue: TerritoryId[] = []
  for (const t of territoriesOf(state, factionId)) {
    if (neighborsOf(t.id).some((n) => state.territories[n.id].owner !== factionId)) {
      dist.set(t.id, 0)
      queue.push(t.id)
    }
  }
  while (queue.length) {
    const cur = queue.shift()!
    for (const n of neighborsOf(cur)) {
      if (state.territories[n.id].owner !== factionId || dist.has(n.id)) continue
      dist.set(n.id, dist.get(cur)! + 1)
      queue.push(n.id)
    }
  }
  return dist
}

function planAttacks(state: GameState, roster: Roster, factionId: string): void {
  const f = state.factions[factionId]
  if (state.turn - f.lastSortie < AI_WAR.sortieRest) return
  const threshold = AI_AGGRESSION[f.personality] * DIFFICULTY[state.difficulty].aiCaution
  const lands = territoriesOf(state, factionId)
  const maxAttacks = lands.length >= 6 ? 2 : 1
  const options: { from: TerritoryId; to: TerritoryId; ids: string[]; ratio: number }[] = []
  const playerFaction = state.factions[PLAYER_ID]
  for (const src of lands) {
    const ready = officersAt(state, src.id, factionId)
      .filter((h) => !h.acted && h.troops >= BATTLE.minTroopsToFight && h.wound < 60)
      .sort((a, b) => unitPower(state, roster, b) - unitPower(state, roster, a))
    if (ready.length === 0) continue
    const enemiesNear = neighborsOf(src.id).some((n) => {
      const owner = state.territories[n.id].owner
      return owner && owner !== factionId && !isAlliedOrTruce(state, factionId, owner)
    })
    // 전선이면 한 명은 남겨 성을 지킨다
    const keep = enemiesNear && ready.length > 1 ? 1 : 0
    const sortie = ready.slice(keep, keep + BATTLE.maxUnits)
    if (sortie.length === 0) continue
    const attack = armyStrength(state, roster, sortie)
    for (const to of marchableNeighbors(state, src.id)) {
      const dst = state.territories[to]
      if (dst.owner === factionId) continue
      if (!checkAttack(state, factionId, src.id, to).ok) continue
      let need = threshold
      if (dst.owner === PLAYER_ID && playerFaction) {
        const diff = DIFFICULTY[state.difficulty]
        const age = state.turn - playerFaction.foundedTurn
        if (age < diff.playerGrace) continue
        if (age < diff.playerEarly) need *= diff.playerEarlyMult
      }
      const ratio = attackRatio(attack, defenseStrength(state, roster, to))
      if (ratio >= need) options.push({ from: src.id, to, ids: sortie.map((h) => h.id), ratio: ratio - need + (dst.owner ? 0 : 0.2) })
    }
  }
  options.sort((a, b) => b.ratio - a.ratio)
  const used = new Set<string>()
  let launched = 0
  for (const opt of options) {
    if (launched >= maxAttacks) break
    if (opt.ids.some((id) => used.has(id))) continue
    if (state.territories[opt.to].owner === factionId) continue
    opt.ids.forEach((id) => used.add(id))
    launchAiAttack(state, roster, factionId, opt.from, opt.to, opt.ids)
    launched++
  }
}

function redeploy(state: GameState, roster: Roster, factionId: string): void {
  const dist = frontierDistance(state, factionId)
  for (const t of territoriesOf(state, factionId)) {
    const d = dist.get(t.id)
    if (d === undefined || d === 0) continue
    const here = officersAt(state, t.id, factionId).filter((h) => !h.acted && h.status === 'officer')
    if (here.length <= 1) continue
    const mover = here.sort((a, b) => b.troops - a.troops)[0]
    // 전선 쪽이라도 이미 찬 고을에는 더 보내지 않는다(한 성에 수백 명이 몰리지 않게)
    const next = marchableNeighbors(state, t.id)
      .filter((id) => state.territories[id].owner === factionId && (dist.get(id) ?? 99) < d)
      .find((id) => officersAt(state, id, factionId).length < AI_WAR.stationCap)
    if (!next) continue
    mover.loc = next
    mover.acted = true
    mover.task = 'move'
    fixGovernor(state, roster, t.id)
    fixGovernor(state, roster, next)
  }
}

const BUILD_PRIORITY: Record<AIPersonality, BuildingType[]> = {
  conqueror: ['barracks', 'fortress', 'market', 'farmland', 'academy'],
  schemer: ['tavern', 'academy', 'market', 'barracks', 'farmland'],
  builder: ['market', 'farmland', 'academy', 'barracks', 'temple'],
  benevolent: ['temple', 'farmland', 'theater', 'market', 'tavern'],
  cautious: ['fortress', 'farmland', 'market', 'barracks', 'temple'],
}

function planBuilding(state: GameState, roster: Roster, factionId: string): void {
  const f = state.factions[factionId]
  const lands = territoriesOf(state, factionId)
  if (lands.length === 0) return
  for (const type of BUILD_PRIORITY[f.personality]) {
    const cost = BUILDINGS[type].gold
    if (f.gold < cost + 500) return
    const site = lands.find((t) => canBuildHere(t, type))
    if (!site) continue
    const builder = officersAt(state, site.id, factionId).find((h) => !h.acted)
    if (!builder) continue
    f.gold -= cost
    site.buildings.push({ type, progress: BUILDINGS[type].months })
    builder.acted = true
    builder.task = 'build'
    return
  }
  // 바다 건너밖에 갈 곳이 없으면 조선소
  const landlocked = lands.every((t) => marchableNeighbors(state, t.id).every((id) => state.territories[id].owner === factionId))
  if (landlocked) {
    const port = lands.find((t) => canBuildHere(t, 'shipyard'))
    if (port && f.gold >= BUILDINGS.shipyard.gold + 300) {
      f.gold -= BUILDINGS.shipyard.gold
      port.buildings.push({ type: 'shipyard', progress: BUILDINGS.shipyard.months })
    }
  }
  void roster
}

function planDiplomacy(state: GameState, roster: Roster, factionId: string): void {
  const f = state.factions[factionId]
  const player = state.factions[PLAYER_ID]
  if (!player || !player.alive) return
  if (state.events.some((e) => !e.resolved && e.kind === 'proposal' && e.factionId === factionId)) return
  if (isAlliedOrTruce(state, factionId, PLAYER_ID)) return
  const rel = f.relations[PLAYER_ID] ?? 0
  const borders = territoriesOf(state, factionId).some((t) => neighborsOf(t.id).some((n) => state.territories[n.id].owner === PLAYER_ID))
  const myPower = factionPower(state, roster, factionId)
  const playerPower = factionPower(state, roster, PLAYER_ID)
  if (borders && rel <= -10 && myPower < playerPower * 0.7 && chance(state, 0.04)) {
    pushEvent(state, { kind: 'proposal', factionId, code: 'ceasefire', amount: Math.round(Math.min(f.gold * 0.3, 400)) })
  } else if (rel >= DIPLOMACY.allianceMin && chance(state, 0.025)) {
    pushEvent(state, { kind: 'proposal', factionId, code: 'alliance', amount: 0 })
  }
}

export function aiTurn(state: GameState, roster: Roster, factionId: string): void {
  const f = state.factions[factionId]
  if (!f || !f.alive || f.isPlayer) return
  planAttacks(state, roster, factionId)
  if (!state.factions[factionId].alive) return
  redeploy(state, roster, factionId)
  const lands = territoriesOf(state, factionId)
  // 땅에 비해 사람이 넘치면 더 모으지 않는다 — 재야 인재가 플레이어 몫으로도 남는다
  const full = membersOf(state, factionId).length >= lands.length * AI_WAR.membersPerLand
  const budget = full ? 0 : lands.length >= 6 ? 2 : 1
  const talent = { recruits: budget, searches: budget }
  // 수도부터 챙기고 나머지는 섞어서 돈다
  const order = lands.slice().sort((a, b) => (a.id === f.capital ? -1 : b.id === f.capital ? 1 : 0))
  for (const t of order) {
    autoCommandTerritory(state, roster, factionId, t.id, { talent, reserve: 250 })
  }
  planBuilding(state, roster, factionId)
  planDiplomacy(state, roster, factionId)
}

const TEMPER: Record<AIPersonality, number> = { benevolent: 8, cautious: 4, builder: 3, schemer: -2, conqueror: -6 }

/**
 * 두 세력이 놓인 형편에서 나오는 본래 사이. 관계는 달마다 이 값 쪽으로 한 걸음씩 돌아간다.
 * 국경을 맞대면 반목이, 멀리 떨어지면 무관심한 호의가, 맹약과 명성은 온기가 붙는다.
 */
export function relationBaseline(state: GameState, aId: string, bId: string): number {
  const a = state.factions[aId]
  const b = state.factions[bId]
  if (!a || !b) return 0
  let v = 0
  const borders = territoriesOf(state, aId).some((t) => neighborsOf(t.id).some((n) => state.territories[n.id].owner === bId))
  if (borders) v -= 12
  else if (TERRITORY_BY_ID[a.capital].region === TERRITORY_BY_ID[b.capital].region) v -= 4
  else v += 4
  if (!a.isPlayer) v += TEMPER[a.personality]
  if (!b.isPlayer) v += TEMPER[b.personality]
  const treaty = a.treaties[bId]
  if (treaty && treaty.until > state.turn) v += treaty.kind === 'alliance' ? 25 : 10
  if (a.isPlayer) v += Math.round(a.fame / 100)
  if (b.isPlayer) v += Math.round(b.fame / 100)
  return clamp(v, -40, 40)
}

/** 관계는 달마다 본래 사이로 조금씩 돌아오고, AI끼리는 사이가 좋으면 가끔 손을 잡는다 */
export function aiRelations(state: GameState): void {
  const alive = Object.values(state.factions).filter((x) => x.alive)
  for (const a of alive) {
    for (const b of alive) {
      if (a.id >= b.id) continue
      const rel = a.relations[b.id] ?? 0
      const base = relationBaseline(state, a.id, b.id)
      const step = DIPLOMACY.relationDecay
      const next = rel > base ? Math.max(base, rel - step) : rel < base ? Math.min(base, rel + step) : rel
      a.relations[b.id] = next
      b.relations[a.id] = next
      if (a.isPlayer || b.isPlayer) continue
      if (next >= 45 && !a.treaties[b.id] && chance(state, 0.03)) {
        const until = state.turn + DIPLOMACY.allianceMonths
        a.treaties[b.id] = { kind: 'alliance', until }
        b.treaties[a.id] = { kind: 'alliance', until }
      }
    }
  }
}
