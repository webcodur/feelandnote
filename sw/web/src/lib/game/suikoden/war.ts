// 천도 v2 — 출진과 전후 처리: 점령·퇴각·포로·세력 멸망

import { autoResolve, createBattle, pickDefenders } from './battle'
import { BATTLE, FAME_GAIN, RECRUIT } from './constants'
import { isAdjacent, neighborsOf, type TerritoryId } from './map'
import { addFame, checkOutcome, clamp, ensureHero, fixGovernor, gainXp, joinFaction, pushEvent, pushLog, releaseHero, setOwner } from './mutate'
import {
  heroMaxTroops, isAlliedOrTruce, marchableNeighbors, membersOf, officersAt, PLAYER_ID, territoriesOf,
} from './query'
import { chance, rand } from './rng'
import type { BattleSide, GameEvent, GameState, Hero, HeroState, Roster } from './types'

export interface AttackCheck {
  ok: boolean
  code: string
}

export function checkAttack(state: GameState, factionId: string, from: TerritoryId, to: TerritoryId): AttackCheck {
  const src = state.territories[from]
  const dst = state.territories[to]
  if (src.owner !== factionId) return { ok: false, code: 'not_own_territory' }
  if (dst.owner === factionId) return { ok: false, code: 'own_target' }
  if (!isAdjacent(from, to)) return { ok: false, code: 'not_adjacent' }
  if (!marchableNeighbors(state, from).includes(to)) return { ok: false, code: 'need_shipyard' }
  if (dst.owner && isAlliedOrTruce(state, factionId, dst.owner)) return { ok: false, code: 'treaty' }
  return { ok: true, code: 'ok' }
}

/** 출진할 수 있는 무장(아직 움직이지 않았고 병력이 있는) */
export function sortieCandidates(state: GameState, factionId: string, from: TerritoryId): HeroState[] {
  return officersAt(state, from, factionId).filter((h) => !h.acted && h.troops >= BATTLE.minTroopsToFight)
}

function markSortie(state: GameState, factionId: string, ids: string[]): void {
  for (const id of ids) {
    const hs = state.heroes[id]
    if (hs) { hs.acted = true; hs.task = 'battle' }
  }
  const f = state.factions[factionId]
  if (f) {
    f.food -= sortieFood(state, ids)
    f.lastSortie = state.turn
  }
}

/** 출진 군량 — 거느린 병력에 비례한다 */
export function sortieFood(state: GameState, ids: string[]): number {
  return Math.round(ids.reduce((sum, id) => sum + (state.heroes[id]?.troops ?? 0), 0) * BATTLE.supplyPerTroop)
}

/** 플레이어 출진 — 전투 화면이 열린다 */
export function launchPlayerAttack(state: GameState, roster: Roster, from: TerritoryId, to: TerritoryId, heroIds: string[]): AttackCheck {
  const check = checkAttack(state, PLAYER_ID, from, to)
  if (!check.ok) return check
  const ready = new Set(sortieCandidates(state, PLAYER_ID, from).map((h) => h.id))
  const ids = heroIds.filter((id) => ready.has(id)).slice(0, BATTLE.maxUnits)
  if (ids.length === 0) return { ok: false, code: 'no_units' }
  if (state.factions[PLAYER_ID].food < sortieFood(state, ids)) return { ok: false, code: 'not_enough_food' }
  markSortie(state, PLAYER_ID, ids)
  const defender = state.territories[to].owner
  state.battle = createBattle(state, roster, {
    territory: to, from, attacker: PLAYER_ID, defender, attackerIds: ids, playerSide: 'attacker', kind: 'invasion',
  })
  if (defender) {
    // 침공당한 쪽은 플레이어를 원망한다
    const f = state.factions[defender]
    if (f) {
      f.relations[PLAYER_ID] = clamp((f.relations[PLAYER_ID] ?? 0) - 15, -100, 100)
      state.factions[PLAYER_ID].relations[defender] = f.relations[PLAYER_ID]
    }
  }
  return { ok: true, code: 'ok' }
}

/** AI 출진. 플레이어 영토면 침공 사건을 남기고, 아니면 그 자리에서 결판낸다 */
export function launchAiAttack(state: GameState, roster: Roster, factionId: string, from: TerritoryId, to: TerritoryId, heroIds: string[]): void {
  const check = checkAttack(state, factionId, from, to)
  if (!check.ok || heroIds.length === 0) return
  if (state.factions[factionId].food < sortieFood(state, heroIds)) return
  markSortie(state, factionId, heroIds)
  const defender = state.territories[to].owner
  if (defender === PLAYER_ID) {
    pushEvent(state, { kind: 'invaded', territory: to, from, factionId, attackers: heroIds })
    pushLog(state, 'invaded', { faction: factionId, at: to, from }, true)
    return
  }
  const battle = createBattle(state, roster, {
    territory: to, from, attacker: factionId, defender, attackerIds: heroIds, playerSide: null, kind: 'invasion',
  })
  autoResolve(battle, state)
  state.battle = battle
  finishBattle(state, roster)
}

/** 침공 사건을 풀어 전투를 연다. auto면 그 자리에서 결판낸다 */
export function openInvasion(state: GameState, roster: Roster, event: GameEvent, mode: 'command' | 'auto'): boolean {
  event.resolved = true
  if (!event.territory || !event.factionId || !event.attackers) return false
  const attackers = event.attackers.filter((id) => {
    const hs = state.heroes[id]
    return hs && hs.faction === event.factionId && (hs.status === 'officer' || hs.status === 'lord') && hs.troops > 0
  })
  const target = state.territories[event.territory]
  if (attackers.length === 0 || target.owner !== PLAYER_ID) return false
  // 지킬 무장이 없으면 지휘할 싸움도 없다 — 그 자리에서 결판난다
  const command = mode === 'command' && pickDefenders(state, roster, event.territory, PLAYER_ID).length > 0
  const battle = createBattle(state, roster, {
    territory: event.territory,
    from: event.from ?? null,
    attacker: event.factionId,
    defender: PLAYER_ID,
    attackerIds: attackers,
    playerSide: command ? 'defender' : null,
    kind: 'invasion',
  })
  state.battle = battle
  if (!command) {
    autoResolve(battle, state)
    finishBattle(state, roster)
  }
  return true
}

// ── 전후 처리 ──

export interface BattleSummary {
  battleId: number
  winner: BattleSide | 'draw'
  playerWon: boolean | null
  territory: TerritoryId
  captured: string[]
  conquered: boolean
  losses: Record<BattleSide, number>
}

function retreatTarget(state: GameState, factionId: string, from: TerritoryId): TerritoryId | null {
  let best: TerritoryId | null = null
  let bestScore = -Infinity
  for (const n of neighborsOf(from)) {
    const t = state.territories[n.id]
    if (t.owner !== factionId) continue
    const score = officersAt(state, n.id, factionId).length * -1 + t.walls / 100
    if (score > bestScore) { bestScore = score; best = n.id }
  }
  return best
}

/** 포로를 가둔다. 가두는 곳은 붙잡은 세력의 가장 가까운 영토 */
function imprison(state: GameState, hero: Hero, captor: string, at: TerritoryId): void {
  const hs = ensureHero(state, hero)
  hs.formerFaction = hs.faction
  hs.status = 'prisoner'
  hs.faction = captor
  hs.troops = 0
  hs.loc = state.territories[at].owner === captor ? at : state.factions[captor]?.capital ?? at
  hs.acted = true
  for (const t of Object.values(state.territories)) if (t.governor === hero.id) t.governor = null
  if (hs.star !== null && hs.formerFaction === PLAYER_ID) hs.star = null
}

/** AI는 붙잡은 포로를 바로 등용하거나 가두거나 풀어 준다 */
function aiDisposePrisoners(state: GameState, roster: Roster, captor: string, ids: string[]): void {
  const f = state.factions[captor]
  const lord = f ? roster.byId.get(f.lordId) : undefined
  for (const id of ids) {
    const hero = roster.byId.get(id)
    const hs = state.heroes[id]
    if (!hero || !hs || !f) continue
    const p = prisonerRecruitChance(state, roster, captor, hero, hs)
    if (chance(state, p * 0.85)) {
      const former = hs.formerFaction
      joinFaction(state, roster, hero, captor, { loc: hs.loc, troopRate: 0.2 })
      if (former === PLAYER_ID) pushLog(state, 'captured_turned', { hero: id, faction: captor }, true)
    } else if (chance(state, 0.5) && hs.formerFaction && state.factions[hs.formerFaction]?.alive) {
      // 풀어 주면 원래 주인에게 돌아간다
      const home = state.factions[hs.formerFaction].capital
      const former = hs.formerFaction
      hs.status = hero.id === state.factions[former].lordId ? 'lord' : 'officer'
      hs.faction = former
      hs.loc = home
      hs.formerFaction = null
      hs.loyalty = Math.max(20, hs.loyalty - 5)
      if (former === PLAYER_ID) pushLog(state, 'prisoner_returned', { hero: id, faction: captor }, true)
    }
    void lord
  }
}

export function prisonerRecruitChance(state: GameState, roster: Roster, captor: string, hero: Hero, hs: HeroState): number {
  const f = state.factions[captor]
  const lord = roster.byId.get(f.lordId)
  const p = RECRUIT.prisonerBase
    + (100 - hs.loyalty) * 0.005
    + f.fame * 0.0002
    + (lord?.stats.charm ?? 50) * 0.002
    - hero.stats.loyalty * 0.003
    - (hero.id === state.factions[hs.formerFaction ?? '']?.lordId ? 0.5 : 0)
  return clamp(p, 0.03, 0.85)
}

/** 영토를 빼앗기면 그곳에 갇힌 포로가 풀린다 */
function freePrisonersAt(state: GameState, roster: Roster, territory: TerritoryId, newOwner: string): void {
  for (const hs of Object.values(state.heroes)) {
    if (hs.status !== 'prisoner' || hs.loc !== territory || hs.faction === newOwner) continue
    const hero = roster.byId.get(hs.id)
    if (!hero) continue
    if (hs.formerFaction === newOwner) {
      hs.status = hero.id === state.factions[newOwner]?.lordId ? 'lord' : 'officer'
      hs.faction = newOwner
      hs.formerFaction = null
      if (newOwner === PLAYER_ID) pushLog(state, 'prisoner_rescued', { hero: hs.id, at: territory }, true)
    } else {
      releaseHero(state, hero, territory)
    }
  }
}

/** 세력이 무너졌는지 본다. 영토가 없거나 사람이 없으면 멸망 */
export function checkFactionFall(state: GameState, roster: Roster): void {
  for (const f of Object.values(state.factions)) {
    if (!f.alive) continue
    const lands = territoriesOf(state, f.id)
    const members = membersOf(state, f.id)
    if (f.id === PLAYER_ID) continue
    if (lands.length > 0 && members.length > 0) {
      // 군주가 없으면 가장 그릇 큰 막료가 뒤를 잇는다
      const lordState = state.heroes[f.lordId]
      if (!lordState || lordState.faction !== f.id || lordState.status !== 'lord') {
        const heir = members
          .map((h) => ({ h, hero: roster.byId.get(h.id) }))
          .filter((x) => x.hero)
          .sort((a, b) => (b.hero!.stats.command + b.hero!.stats.charm) - (a.hero!.stats.command + a.hero!.stats.charm))[0]
        if (heir) {
          heir.h.status = 'lord'
          f.lordId = heir.h.id
          pushLog(state, 'succession', { faction: f.id, hero: heir.h.id }, false)
        }
      }
      continue
    }
    f.alive = false
    f.fallenTurn = state.turn
    for (const t of lands) setOwner(state, t.id, null)
    for (const h of members) {
      const hero = roster.byId.get(h.id)
      if (hero) releaseHero(state, hero)
    }
    for (const hs of Object.values(state.heroes)) {
      if (hs.status === 'prisoner' && hs.faction === f.id) {
        const hero = roster.byId.get(hs.id)
        if (hero) releaseHero(state, hero)
      }
    }
    for (const other of Object.values(state.factions)) delete other.treaties[f.id]
    pushLog(state, 'faction_fell', { faction: f.id, lord: f.lordId }, true)
    if (state.playerFaction) pushEvent(state, { kind: 'faction_fell', factionId: f.id, heroId: f.lordId })
  }
}

/** 끝난 전투를 캠페인에 반영하고 전투를 닫는다 */
export function finishBattle(state: GameState, roster: Roster): BattleSummary | null {
  const b = state.battle
  if (!b || !b.result) return null
  const winner = b.result
  const attackerWon = winner === 'attacker'
  const losing: BattleSide = attackerWon ? 'defender' : 'attacker'
  const losses: Record<BattleSide, number> = { attacker: 0, defender: 0 }
  const captured: string[] = []
  const t = state.territories[b.territory]
  const defenderFaction = b.defender
  const attackerFaction = b.attacker
  const mine = attackerFaction === PLAYER_ID || defenderFaction === PLAYER_ID

  // 1) 병력·부상·공적 반영
  for (const u of b.units) {
    losses[u.side] += Math.max(0, u.startTroops - u.troops)
    if (u.militia) continue
    const hs = state.heroes[u.heroId]
    if (!hs) continue
    hs.troops = u.troops
    hs.wound = Math.min(100, Math.max(hs.wound, u.wound) + (u.routed ? 30 : 0))
    if (hs.faction) gainXp(state, hs, 25 + Math.round(u.dealt / 150))
  }

  // 2) 사로잡기 — 무너진 부대와 물러날 곳 없는 부대
  const captor = attackerWon ? attackerFaction : defenderFaction
  const retreatFrom = b.territory
  for (const u of b.units) {
    if (u.side !== losing || u.militia) continue
    const hero = roster.byId.get(u.heroId)
    const hs = state.heroes[u.heroId]
    if (!hero) continue
    const factionOfUnit = u.side === 'attacker' ? attackerFaction : defenderFaction
    const isPlayerLord = factionOfUnit === PLAYER_ID && hero.id === state.lordId
    // 공격이 실패하면 살아남은 부대는 출발지로 돌아간다
    if (u.side === 'attacker') {
      if (u.routed && captor && !isPlayerLord && chance(state, BATTLE.captureBase * 0.75)) {
        imprison(state, hero, captor, b.territory)
        captured.push(hero.id)
      }
      continue
    }
    // 수비가 무너졌다
    if (!factionOfUnit) {
      // 토박이 인재 — 무너지면 붙잡힐 수 있다
      if (u.routed && captor && chance(state, 0.6)) {
        imprison(state, hero, captor, b.territory)
        captured.push(hero.id)
      }
      continue
    }
    const escape = retreatTarget(state, factionOfUnit, retreatFrom)
    const caught = captor && !isPlayerLord && (!escape || (u.routed && chance(state, BATTLE.captureBase)))
    if (caught && captor) {
      imprison(state, hero, captor, b.territory)
      captured.push(hero.id)
    } else if (escape && hs) {
      hs.loc = escape
    }
  }

  // 3) 점령
  let conquered = false
  if (b.kind === 'invasion' && attackerWon && attackerFaction) {
    conquered = true
    // 싸움에 나가지 않은 수비 무장도 물러나거나 붙잡힌다
    if (defenderFaction) {
      for (const hs of officersAt(state, b.territory, defenderFaction)) {
        const hero = roster.byId.get(hs.id)
        if (!hero) continue
        const escape = retreatTarget(state, defenderFaction, b.territory)
        const isPlayerLord = defenderFaction === PLAYER_ID && hero.id === state.lordId
        if (escape) hs.loc = escape
        else if (!isPlayerLord) { imprison(state, hero, attackerFaction, b.territory); captured.push(hero.id) }
      }
    }
    setOwner(state, b.territory, attackerFaction)
    t.order = Math.max(10, t.order - 10)
    t.population = Math.round(t.population * 0.95)
    t.walls = Math.round(Math.min(t.walls, b.walls) * 0.9)
    t.threat = null
    for (const u of b.units) {
      if (u.side !== 'attacker' || u.militia) continue
      const hs = state.heroes[u.heroId]
      if (hs && hs.status !== 'prisoner') hs.loc = b.territory
    }
    freePrisonersAt(state, roster, b.territory, attackerFaction)
    fixGovernor(state, roster, b.territory)
    addFame(state, attackerFaction, defenderFaction ? FAME_GAIN.conquer : FAME_GAIN.conquerNeutral)
    if (defenderFaction) addFame(state, defenderFaction, FAME_GAIN.territoryLost)
    if (defenderFaction) fixGovernor(state, roster, state.factions[defenderFaction]?.capital ?? b.territory)
    // 수도를 잃으면 남은 영토 가운데 가장 큰 곳으로 옮긴다
    if (defenderFaction && state.factions[defenderFaction]?.capital === b.territory) {
      const rest = territoriesOf(state, defenderFaction).sort((x, y) => y.population - x.population)[0]
      if (rest) state.factions[defenderFaction].capital = rest.id
    }
    if (attackerFaction === PLAYER_ID) state.stats.conquered += 1
    pushLog(state, defenderFaction ? 'conquer' : 'conquer_neutral', { faction: attackerFaction, at: b.territory, from: defenderFaction ?? '' }, mine)
  } else if (b.kind === 'invasion') {
    if (!defenderFaction) {
      // 향병이 버텨 냈다 — 향병 수가 줄어든 만큼 다음엔 쉽다
      const militiaLeft = b.units.filter((u) => u.militia && u.side === 'defender').reduce((s, u) => s + u.troops, 0)
      t.militia = Math.max(0, militiaLeft)
    } else {
      t.walls = Math.min(t.walls, b.walls)
    }
    if (defenderFaction) addFame(state, defenderFaction, FAME_GAIN.battleWin)
    if (attackerFaction) addFame(state, attackerFaction, FAME_GAIN.battleLose)
    pushLog(state, 'repelled', { faction: attackerFaction ?? '', at: b.territory, defender: defenderFaction ?? '' }, mine)
  }

  // 4) 포로
  if (captured.length > 0 && captor) {
    if (captor === PLAYER_ID) pushEvent(state, { kind: 'prisoners', prisoners: captured.slice(), territory: b.territory })
    else aiDisposePrisoners(state, roster, captor, captured)
  }

  // 5) 전적
  let playerWon: boolean | null = null
  if (b.playerSide || mine) {
    const playerSide: BattleSide = attackerFaction === PLAYER_ID ? 'attacker' : 'defender'
    playerWon = winner === playerSide
    if (playerWon) state.stats.battlesWon += 1
    else state.stats.battlesLost += 1
  }
  for (const id of [attackerFaction, defenderFaction]) if (id) fixGovernor(state, roster, state.factions[id]?.capital ?? b.territory)

  state.battle = null
  checkFactionFall(state, roster)
  // 플레이어가 낀 싸움이면 그 자리에서 판정한다 — 마지막 적을 꺾었거나 마지막 땅을 잃었으면 곧바로 결과 화면
  if (mine) checkOutcome(state)
  return { battleId: b.id, winner, playerWon, territory: b.territory, captured, conquered, losses }
}

/** 포로 처분 — 등용·석방·투옥 유지 */
export function disposePrisoner(state: GameState, roster: Roster, heroId: string, action: 'recruit' | 'release' | 'keep'): 'joined' | 'refused' | 'released' | 'kept' {
  const hs = state.heroes[heroId]
  const hero = roster.byId.get(heroId)
  if (!hs || !hero || hs.status !== 'prisoner' || hs.faction !== PLAYER_ID) return 'kept'
  if (action === 'recruit') {
    const p = prisonerRecruitChance(state, roster, PLAYER_ID, hero, hs)
    if (chance(state, p)) {
      const loc = state.territories[hs.loc].owner === PLAYER_ID ? hs.loc : state.factions[PLAYER_ID].capital
      joinFaction(state, roster, hero, PLAYER_ID, { loc, troopRate: 0.2, loyalty: 45 + Math.round(rand(state) * 15) })
      hs.formerFaction = null
      state.stats.recruited += 1
      pushLog(state, 'prisoner_joined', { hero: heroId }, true)
      return 'joined'
    }
    return 'refused'
  }
  if (action === 'release') {
    const former = hs.formerFaction
    if (former && state.factions[former]?.alive) {
      hs.status = heroId === state.factions[former].lordId ? 'lord' : 'officer'
      hs.faction = former
      hs.loc = state.factions[former].capital
      hs.formerFaction = null
      const f = state.factions[former]
      f.relations[PLAYER_ID] = clamp((f.relations[PLAYER_ID] ?? 0) + 10, -100, 100)
      state.factions[PLAYER_ID].relations[former] = f.relations[PLAYER_ID]
    } else {
      releaseHero(state, hero, hero.home)
    }
    addFame(state, PLAYER_ID, 2)
    return 'released'
  }
  return 'kept'
}

export function troopsLeftAfter(hero: Hero, hs: HeroState, state: GameState): number {
  return Math.min(hs.troops, heroMaxTroops(hero, hs, state))
}
