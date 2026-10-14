import { checkOutcome, addFame, clamp, gainXp, pushLog, joinFaction, releaseHero, fixGovernor } from './mutate'
import { factionPower, membersOf, PLAYER_ID, relationOf, territoriesOf, treatyOf } from './query'
import { chance } from './rng'
import type { CommandResult } from './commands'
import type { GameState, Hero, Roster } from './types'
import { DIPLOMACY } from './constants'

export type DiploAction = 'gift' | 'alliance' | 'ceasefire' | 'surrender' | 'break'
export function surrenderWait(state: GameState, factionId: string): number {
  const target = state.factions[factionId]
  return target ? Math.max(0, DIPLOMACY.surrenderMonths - (state.turn - target.foundedTurn)) : 0
}
export function diplomacyChance(state: GameState, roster: Roster, envoy: Hero, targetId: string, action: DiploAction): number {
  const player = state.factions[PLAYER_ID], target = state.factions[targetId]
  if (!player || !target?.alive || targetId === PLAYER_ID) return 0
  if (action === 'gift') return 1
  if (action === 'break') return treatyOf(state, PLAYER_ID, targetId) ? 1 : 0
  const rel = relationOf(state, PLAYER_ID, targetId)
  if (action === 'alliance' && (rel < DIPLOMACY.allianceMin || treatyOf(state, PLAYER_ID, targetId)?.kind === 'alliance')) return 0
  const ratio = factionPower(state, roster, PLAYER_ID) / Math.max(1, factionPower(state, roster, targetId))
  if (action === 'surrender' && (surrenderWait(state, targetId) > 0 || ratio < 2)) return 0
  return clamp(0.2 + envoy.stats.charm * 0.004 + envoy.stats.intellect * 0.001 + rel * 0.003 + (action === 'surrender' ? (ratio - 2) * 0.1 - 0.3 : 0), 0.05, 0.9)
}
export function setTreaty(state: GameState, targetId: string, kind: 'alliance' | 'ceasefire'): void {
  const player = state.factions[PLAYER_ID], target = state.factions[targetId]
  if (!player || !target) return
  const treaty = { kind, until: state.turn + (kind === 'alliance' ? DIPLOMACY.allianceMonths : DIPLOMACY.ceasefireMonths) }
  player.treaties[targetId] = { ...treaty }
  target.treaties[PLAYER_ID] = { ...treaty }
  pushLog(state, kind, { faction: targetId }, true)
}
export function runDiplomacy(state: GameState, roster: Roster, envoyId: string, targetId: string, action: DiploAction): CommandResult {
  const envoy = roster.byId.get(envoyId), hs = state.heroes[envoyId], player = state.factions[PLAYER_ID], target = state.factions[targetId]
  const fail = (code: string): CommandResult => ({ ok: false, code })
  if (state.outcome || state.phase !== 'strategy' || state.battle || !player || !target?.alive || !envoy || !hs || hs.faction !== PLAYER_ID || !['officer', 'lord'].includes(hs.status)) return fail('invalid_officer')
  if (hs.acted) return fail('already_acted')
  const p = diplomacyChance(state, roster, envoy, targetId, action)
  if (!p) return fail('diplomacy_unavailable')
  if (action === 'gift' && player.gold < DIPLOMACY.giftGold) return fail('not_enough_gold')
  hs.acted = true; hs.task = 'diplomacy'; gainXp(state, hs, 15)
  if (action === 'gift') {
    player.gold -= DIPLOMACY.giftGold; target.gold += DIPLOMACY.giftGold
    player.relations[targetId] = clamp(relationOf(state, PLAYER_ID, targetId) + DIPLOMACY.giftRelation, -100, 100)
    target.relations[PLAYER_ID] = player.relations[targetId]
    return { ok: true, code: 'gift_done', params: { gain: DIPLOMACY.giftRelation } }
  }
  if (action === 'break') {
    delete player.treaties[targetId]; delete target.treaties[PLAYER_ID]
    player.relations[targetId] = target.relations[PLAYER_ID] = -50
    addFame(state, PLAYER_ID, -10)
    pushLog(state, 'treaty_broken', { faction: targetId }, true)
    return { ok: true, code: 'break_done' }
  }
  if (!chance(state, p)) return { ok: true, code: `${action}_fail` }
  if (action === 'alliance' || action === 'ceasefire') {
    setTreaty(state, targetId, action)
    addFame(state, PLAYER_ID, action === 'alliance' ? 3 : 2)
    return { ok: true, code: `${action}_ok` }
  }
  for (const territory of territoriesOf(state, targetId)) {
    territory.owner = PLAYER_ID; territory.governor = null; territory.delegate = false
  }
  for (const member of membersOf(state, targetId)) {
    const hero = roster.byId.get(member.id)
    if (hero) joinFaction(state, roster, hero, PLAYER_ID, { loc: member.loc, loyalty: Math.max(50, member.loyalty) })
  }
  for (const member of Object.values(state.heroes)) {
    if (member.faction === targetId && member.status === 'prisoner') {
      const hero = roster.byId.get(member.id)
      if (hero) releaseHero(state, hero)
    }
  }
  player.gold += target.gold; player.food += target.food
  target.gold = 0; target.food = 0; target.alive = false; target.fallenTurn = state.turn
  for (const territory of territoriesOf(state, PLAYER_ID)) fixGovernor(state, roster, territory.id)
  addFame(state, PLAYER_ID, 10)
  pushLog(state, 'surrender', { faction: targetId }, true)
  checkOutcome(state)
  return { ok: true, code: 'surrender_ok' }
}
