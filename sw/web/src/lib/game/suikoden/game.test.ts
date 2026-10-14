import assert from 'node:assert/strict'
import test from 'node:test'
import { createGame, createPlayerFaction } from './world'
import { buildRoster } from './roster'
import { TERRITORIES, TERRITORY_IDS, neighborsOf } from './map'
import { createBattle, autoResolve, startDuel, autoDuel, closeDuel } from './battle'
import { checkOutcome } from './mutate'
import { endTurn, pendingBlocking } from './turn'
import { runCommand } from './commands'
import { wanderMove, wanderResolve } from './wander'
import { saveGame, loadGame, readSaveMeta, clearSave } from './save'
import { resolveEvent } from './events'
import { diplomacyChance, runDiplomacy } from './diplomacy'
import type { GameState, Roster, RosterRow } from './types'
import { DIFFICULTY, STAT_KEYS } from './constants'

function fixtureRoster(): Roster {
  const rows: RosterRow[] = TERRITORY_IDS.flatMap((id, i) => [0, 1, 2].map(j => [
    `test-${id}-${j}`, `Officer ${i}-${j}`, '', j === 1 ? 'scientist' : 'commander', '', 1, 1000 + i, 1080 + i, null,
    STAT_KEYS.map((_, k) => k < 4 ? 60 + (i + j * 7) % 35 : k < 12 ? 70 : 0), 50, 'R', 0, 100,
  ] as RosterRow))
  const roster = buildRoster(rows, '')
  for (const [i, hero] of roster.heroes.entries()) hero.home = TERRITORY_IDS[Math.floor(i / 3)]
  roster.byHome = new Map(TERRITORY_IDS.map(id => [id, roster.heroes.filter(h => h.home === id)]))
  return roster
}
function start(seed = 1234) {
  const roster = fixtureRoster(), state = createGame(roster, { lordId: roster.heroes[0].id, difficulty: 'normal', seed })
  return { roster, state }
}
function raise(state: GameState, roster: Roster) { createPlayerFaction(state, roster, state.wander!.loc) }

test('a seeded realm has every territory, living factions, and deterministic initial state', () => {
  const a = start(), b = start()
  assert.deepEqual(a.state, b.state)
  assert.equal(Object.keys(a.state.territories).length, TERRITORIES.length)
  assert.ok(Object.values(a.state.factions).length > 0)
  for (const faction of Object.values(a.state.factions)) {
    assert.equal(a.state.territories[faction.capital].owner, faction.id)
    assert.equal(a.state.heroes[faction.lordId].faction, faction.id)
  }
})
test('wandering, founding and a development command preserve coherent state', () => {
  const { roster, state } = start()
  const destination = neighborsOf(state.wander!.loc).find(n => !n.sea)!
  const traveled = wanderMove(state, roster, destination.id)
  assert.notEqual(traveled, state)
  assert.equal(state.turn, 0)
  assert.equal(traveled.turn, 1)
  assert.equal(traveled.wander!.loc, destination.id)
  if (traveled.wander!.encounter) {
    const resolved = wanderResolve(traveled, roster, 'leave')
    assert.equal(resolved.wander!.encounter!.resolved, true)
  }
  raise(state, roster)
  assert.equal(state.phase, 'strategy')
  assert.equal(state.playerFaction, 'player')
  const hs = state.heroes[state.lordId], at = state.territories[hs.loc]
  const before = at.farm
  const result = runCommand(state, roster, 'player', { kind: 'farm', heroId: hs.id })
  assert.equal(result.ok, true)
  assert.ok(at.farm > before)
  assert.equal(runCommand(state, roster, 'player', { kind: 'farm', heroId: hs.id }).ok, false)
})
test('unresolved decisions block a month and visitor acceptance is applied once', () => {
  const { roster, state } = start(); raise(state, roster)
  const at = state.heroes[state.lordId].loc, visitor = roster.heroes.find(hero => hero.home !== at && !state.heroes[hero.id])!
  assert.notEqual(visitor.home, at)
  state.events.push({ id: 900, turn: state.turn, resolved: false, kind: 'visitor', heroId: visitor.id, territory: at })
  assert.equal(endTurn(state, roster), state)
  const next = resolveEvent(state, roster, 900, 'accept')
  assert.equal(next.heroes[visitor.id].faction, 'player')
  assert.equal(next.heroes[visitor.id].loc, at)
  assert.equal(pendingBlocking(next).length, 0)
  assert.equal(resolveEvent(next, roster, 900, 'accept'), next)
})
test('automatic battles and duels terminate with finite, nonnegative troop state', () => {
  const { roster, state } = start(); raise(state, roster)
  const target = TERRITORY_IDS.find(id => !state.territories[id].owner)!
  const battle = createBattle(state, roster, { territory: target, from: state.heroes[state.lordId].loc, attacker: 'player', defender: null, attackerIds: [state.lordId], playerSide: 'attacker', kind: 'invasion' })
  const a = battle.units.find(u => u.side === 'attacker')!, b = battle.units.find(u => u.side === 'defender')!
  battle.duel = startDuel(state, a, b, 'a')
  autoDuel(battle, state); assert.equal(battle.duel?.done, true)
  closeDuel(battle); assert.equal(battle.duel, null)
  autoResolve(battle, state)
  assert.ok(battle.result)
  for (const unit of battle.units) assert.ok(Number.isFinite(unit.troops) && unit.troops >= 0)
})
test('diplomatic orders spend an officer action and gifts transfer only their stated cost', () => {
  const { roster, state } = start(); raise(state, roster)
  const target = Object.values(state.factions).find(f => !f.isPlayer)!
  const before = state.factions.player.gold, theirBefore = target.gold
  const hero = roster.byId.get(state.lordId)!
  assert.equal(diplomacyChance(state, roster, hero, target.id, 'gift'), 1)
  const result = runDiplomacy(state, roster, hero.id, target.id, 'gift')
  assert.equal(result.ok, true)
  assert.equal(before - state.factions.player.gold, target.gold - theirBefore)
  assert.equal(runDiplomacy(state, roster, hero.id, target.id, 'gift').ok, false)
})
test('defeat, unification and time limit resolve immediately', () => {
  for (const kind of ['fallen', 'unified', 'timeout'] as const) {
    const { roster, state } = start(); raise(state, roster)
    if (kind === 'fallen') for (const t of Object.values(state.territories)) if (t.owner === 'player') t.owner = null
    if (kind === 'unified') for (const faction of Object.values(state.factions)) if (!faction.isPlayer) faction.alive = false
    if (kind === 'timeout') state.turn = DIFFICULTY[state.difficulty].limitYears * 12
    assert.equal(checkOutcome(state)?.kind, kind)
    assert.equal(state.phase, 'result')
  }
})
test('autosave restores the exact RNG and rejects malformed or obsolete save data', () => {
  const values = new Map<string, string>()
  const storage: Storage = { get length() { return values.size }, clear: () => values.clear(), getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v) }, removeItem: k => { values.delete(k) }, key: i => [...values.keys()][i] ?? null }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } })
  try {
    const { roster, state } = start()
    assert.equal(saveGame(state), true)
    assert.deepEqual(loadGame(roster), state)
    assert.equal(readSaveMeta()?.lordId, state.lordId)
    const [key] = values.keys(); values.set(key, '{broken')
    assert.equal(loadGame(roster), null); assert.equal(readSaveMeta(), null)
    values.set(key, JSON.stringify({ ...state, version: 1 }))
    assert.equal(loadGame(roster), null)
    values.set(key, JSON.stringify({ ...state, phase: 'battle', battle: { units: [null] } }))
    assert.equal(loadGame(roster), null)
    storage.setItem = () => { throw new Error('Storage quota exceeded') }
    assert.equal(saveGame(state), false)
    clearSave(); assert.equal(values.size, 0)
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})

test('multiple seeded campaigns reach an ending without unresolved event loops or invalid numbers', () => {
  const roster = fixtureRoster()
  for (const difficulty of ['easy', 'normal', 'hard'] as const) for (const seed of [1, 42, 2026]) {
    let state = createGame(roster, { lordId: roster.heroes[0].id, difficulty, seed })
    raise(state, roster)
    let steps = 0
    const limit = DIFFICULTY[difficulty].limitYears * 12
    const initialAiLands = Object.values(state.territories).filter(t => t.owner && t.owner !== 'player').length
    let maxAiLands = initialAiLands
    while (!state.outcome && steps++ <= limit) {
      for (let decisions = 0; decisions < 100; decisions++) {
        const event = state.events.find(e => !e.resolved)
        if (!event || state.outcome) break
        const choice = event.kind === 'invaded' ? 'auto' : event.kind === 'visitor' ? 'accept' : event.kind === 'proposal' ? 'decline' : event.kind === 'discontent' ? 'persuade' : 'ok'
        const next = resolveEvent(state, roster, event.id, choice)
        assert.notEqual(next, state, `Event stuck: ${difficulty}/${seed}/${event.kind}`)
        state = next
      }
      if (state.outcome) break
      const next = endTurn(state, roster)
      assert.equal(next.turn, state.turn + 1)
      state = next
      maxAiLands = Math.max(maxAiLands, Object.values(state.territories).filter(t => t.owner && t.owner !== 'player').length)
      for (const territory of Object.values(state.territories)) for (const key of ['population', 'farm', 'commerce', 'walls', 'order', 'militia'] as const) assert.ok(Number.isFinite(territory[key]) && territory[key] >= 0, key)
      for (const hero of Object.values(state.heroes)) assert.ok(Number.isFinite(hero.troops) && hero.troops >= 0)
    }
    assert.ok(state.outcome, `${difficulty}/${seed} never ended`)
    assert.ok(maxAiLands > initialAiLands, `${difficulty}/${seed}: AI never expanded`)
    assert.equal(state.phase, 'result')
    assert.equal(runCommand(state, roster, 'player', { kind: 'farm', heroId: state.lordId }).ok, false)
  }
})
