import { TERRITORY_IDS } from './map'
import { CLASSES, DIFFICULTY, SAVE_KEY } from './constants'
import type { GameState, Roster } from './types'

export type SaveMeta = Pick<GameState, 'lordId' | 'turn' | 'phase' | 'difficulty'> & { territories: number }
function storage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage } catch { return null }
}
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const numbers = (value: unknown, keys: readonly string[]): boolean => object(value) && keys.every(key => finite(value[key]))
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string')
const location = (value: unknown): boolean => typeof value === 'string' && TERRITORY_IDS.includes(value as typeof TERRITORY_IDS[number])

function readState(): GameState | null {
  try {
    const raw = storage()?.getItem(SAVE_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (!object(value) || value.version !== 2 || !finite(value.seed) || !finite(value.rngState)
      || !finite(value.turn) || !Number.isInteger(value.turn) || value.turn < 0
      || !Object.hasOwn(DIFFICULTY, String(value.difficulty))
      || !['wander', 'strategy', 'battle', 'result'].includes(String(value.phase))
      || typeof value.lordId !== 'string' || !object(value.territories) || !object(value.factions) || !object(value.heroes)
      || !Array.isArray(value.events) || !Array.isArray(value.log) || !object(value.stats) || !object(value.settings)) return null
    if (![1, 2, 3].includes(Number(value.settings.battleSpeed)) || typeof value.settings.autoBattle !== 'boolean'
      || !numbers(value.stats, ['battlesWon', 'battlesLost', 'recruited', 'conquered', 'maxTerritories', 'fameRank'])) return null
    for (const [id, faction] of Object.entries(value.factions)) {
      if (!object(faction) || faction.id !== id || typeof faction.lordId !== 'string' || !location(faction.capital)
        || !numbers(faction, ['gold', 'food', 'fame', 'foundedTurn', 'lastSortie']) || typeof faction.alive !== 'boolean'
        || !object(faction.relations) || !object(faction.treaties) || !object(faction.discovered) || !strings(faction.stars)) return null
    }
    for (const id of TERRITORY_IDS) {
      const territory = value.territories[id]
      if (!object(territory) || territory.id !== id || !Array.isArray(territory.buildings)
        || !['population', 'farm', 'commerce', 'walls', 'order', 'slots', 'militia'].every(key => finite(territory[key]))) return null
      if (territory.owner !== null && (typeof territory.owner !== 'string' || !object(value.factions[territory.owner]))) return null
    }
    for (const [id, hero] of Object.entries(value.heroes)) {
      if (!object(hero) || hero.id !== id || !TERRITORY_IDS.includes(hero.loc as typeof TERRITORY_IDS[number])
        || !['free', 'lord', 'officer', 'companion', 'prisoner'].includes(String(hero.status))
        || !['troops', 'training', 'loyalty', 'wound', 'xp', 'level', 'joinedTurn'].every(key => finite(hero[key]))) return null
    }
    if (value.wander !== null && (!object(value.wander) || !location(value.wander.loc) || !strings(value.wander.party) || !strings(value.wander.met)
      || !numbers(value.wander, ['gold', 'fame', 'turns']))) return null
    if (value.phase === 'wander' && !object(value.wander)) return null
    if (value.battle !== null) {
      const battle = value.battle
      if (!object(battle) || !location(battle.territory) || !numbers(battle, ['id', 'round', 'maxRounds', 'walls', 'fxSeq'])
        || !numbers(battle.morale, ['attacker', 'defender']) || !Array.isArray(battle.units) || !Array.isArray(battle.log)) return null
      for (const unit of battle.units) {
        if (!object(unit) || typeof unit.heroId !== 'string' || !['attacker', 'defender'].includes(String(unit.side))
          || !Object.hasOwn(CLASSES, String(unit.cls)) || !object(unit.statuses) || !numbers(unit.stats, ['command', 'martial', 'intellect', 'charm', 'courage', 'benevolence', 'cautious_bold'])
          || !numbers(unit, ['troops', 'maxTroops', 'startTroops', 'training', 'wound', 'next', 'speed', 'cooldown', 'row', 'col'])) return null
      }
      if (battle.duel !== null && (!object(battle.duel) || !strings([battle.duel.a, battle.duel.b])
        || !numbers(battle.duel, ['hpA', 'hpB', 'maxA', 'maxB']) || !Array.isArray(battle.duel.rounds))) return null
    }
    if (value.phase === 'battle' && !object(value.battle)) return null
    if (value.events.some(event => !object(event) || !numbers(event, ['id', 'turn']) || typeof event.kind !== 'string' || typeof event.resolved !== 'boolean')) return null
    if (value.log.some(entry => !object(entry) || typeof entry.code !== 'string' || !object(entry.params) || !finite(entry.turn))) return null
    if (value.report !== null && (!object(value.report) || !numbers(value.report.income, ['gold', 'food']) || !numbers(value.report.expense, ['gold', 'food']) || !Array.isArray(value.report.entries))) return null
    if (value.outcome !== null && (!object(value.outcome) || !['unified', 'fallen', 'timeout'].includes(String(value.outcome.kind)) || !finite(value.outcome.turn))) return null
    if (value.phase === 'result' && !object(value.outcome)) return null
    if (!['wander', 'result'].includes(String(value.phase)) && (typeof value.playerFaction !== 'string' || !object(value.factions[value.playerFaction]))) return null
    return value as unknown as GameState
  } catch { return null }
}
export function saveGame(state: GameState): boolean {
  try {
    const target = storage()
    if (!target) return false
    target.setItem(SAVE_KEY, JSON.stringify(state))
    return true
  } catch { return false }
}
export function loadGame(roster: Roster): GameState | null {
  const state = readState()
  if (!state || !roster.byId.has(state.lordId) || Object.keys(state.heroes).some(id => !roster.byId.has(id))
    || state.wander?.party.some(id => !roster.byId.has(id)) || Object.values(state.factions).some(faction => !roster.byId.has(faction.lordId))) return null
  return state
}
export function readSaveMeta(): SaveMeta | null {
  const state = readState()
  if (!state || state.outcome) return null
  return { lordId: state.lordId, turn: state.turn, phase: state.phase, difficulty: state.difficulty, territories: Object.values(state.territories).filter(t => t.owner === state.playerFaction && t.owner !== null).length }
}
export function clearSave(): void { try { storage()?.removeItem(SAVE_KEY) } catch { /* Play can continue without storage. */ } }
