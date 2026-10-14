import { clamp, ensureHero, fixGovernor, joinFaction, pushLog, releaseHero } from './mutate'
import { heroStateOf, PLAYER_ID } from './query'
import { chance } from './rng'
import { disposePrisoner, openInvasion } from './war'
import { DIPLOMACY, LOYALTY } from './constants'
import { setTreaty } from './diplomacy'
import type { GameState, Roster } from './types'

export type EventChoice = 'accept' | 'decline' | 'release' | 'persuade' | 'reward' | 'command' | 'auto' | 'ok'
export function resolveEvent(prev: GameState, roster: Roster, eventId: number, choice: EventChoice): GameState {
  if (prev.outcome || prev.battle || prev.phase !== 'strategy') return prev
  const original = prev.events.find(e => e.id === eventId && !e.resolved)
  if (!original) return prev
  const state = structuredClone(prev), event = state.events.find(e => e.id === eventId)!
  const player = state.factions[PLAYER_ID]
  if (!player) return prev
  if (event.kind === 'invaded') {
    if (choice !== 'command' && choice !== 'auto') return prev
    openInvasion(state, roster, event, choice)
    if (state.battle) state.phase = 'battle'
    return state
  }
  if (event.kind === 'visitor') {
    if (choice !== 'accept' && choice !== 'decline') return prev
    const hero = event.heroId ? roster.byId.get(event.heroId) : null
    if (choice === 'accept' && hero && event.territory && state.territories[event.territory].owner === PLAYER_ID
      && heroStateOf(state, hero).status === 'free') {
      joinFaction(state, roster, hero, PLAYER_ID, { loc: event.territory })
      state.stats.recruited++
      pushLog(state, 'visitor_joined', { hero: hero.id, at: event.territory }, true)
    }
  } else if (event.kind === 'discontent') {
    if (!['reward', 'persuade', 'release'].includes(choice)) return prev
    const hero = event.heroId ? roster.byId.get(event.heroId) : null
    const hs = hero ? ensureHero(state, hero) : null
    if (hero && hs && hs.faction === PLAYER_ID && hs.status === 'officer') {
      if (choice === 'reward') {
        if (player.gold < LOYALTY.rewardGold) return prev
        player.gold -= LOYALTY.rewardGold
        hs.loyalty = clamp(hs.loyalty + LOYALTY.rewardGain, 0, 100)
      } else if (choice === 'persuade') {
        const lord = roster.byId.get(state.lordId)
        if (chance(state, (lord?.stats.charm ?? 50) / 100)) hs.loyalty = clamp(hs.loyalty + 10, 0, 100)
      } else {
        const loc = hs.loc
        releaseHero(state, hero)
        fixGovernor(state, roster, loc)
      }
      pushLog(state, 'discontent_resolved', { hero: hero.id }, true)
    }
  } else if (event.kind === 'proposal') {
    if (choice !== 'accept' && choice !== 'decline') return prev
    const other = event.factionId ? state.factions[event.factionId] : null
    if (choice === 'accept' && other?.alive && ['alliance', 'ceasefire'].includes(event.code ?? '')) {
      setTreaty(state, other.id, event.code === 'alliance' ? 'alliance' : 'ceasefire')
      if (event.code === 'ceasefire') {
        const gold = Math.max(0, Math.min(event.amount ?? 0, other.gold))
        other.gold -= gold; player.gold += gold
      }
    }
  } else if (choice !== 'ok') return prev
  event.resolved = true
  state.events = state.events.filter(e => !e.resolved || state.turn - e.turn < DIPLOMACY.allianceMonths)
  return state
}
export function resolvePrisoner(prev: GameState, roster: Roster, heroId: string, action: 'recruit' | 'release' | 'keep') {
  if (prev.outcome || prev.battle || prev.phase !== 'strategy') return { state: prev, result: 'kept' as const }
  const state = structuredClone(prev)
  const result = disposePrisoner(state, roster, heroId, action)
  return { state, result }
}
