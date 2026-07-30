import { DIFFICULTY_CONFIG, TERRITORIES } from './constants'
import type { GameState } from './types'

/**
 * 영토·세력 변경 뒤 캠페인 종료 여부를 한곳에서 판정한다.
 * 인물이 사라진 AI 세력의 영토는 무주지로 되돌리고, 플레이어는
 * 시나리오의 모든 활성 영토를 직접 차지해야 통일한 것으로 본다.
 */
export function resolveCampaignOutcome(state: GameState): GameState {
  const defunctFactions = state.factions.filter(
    faction => faction.id !== state.playerFactionId
      && (faction.members.length === 0 || faction.territories.length === 0),
  )
  const defunctFactionIds = new Set(defunctFactions.map(faction => faction.id))

  let normalized = state
  if (defunctFactionIds.size > 0) {
    const survivingFactions = state.factions.filter(faction => !defunctFactionIds.has(faction.id))
    const retainedCharacterIds = new Set([
      ...survivingFactions.flatMap(faction => [
        ...faction.members.map(member => member.id),
        ...faction.prisoners.map(prisoner => prisoner.id),
      ]),
      ...state.wanderers.map(wanderer => wanderer.id),
      ...(state.disposition?.targets.map(target => target.character.id) ?? []),
    ])
    const displacedCharacters = defunctFactions
      .flatMap(faction => [...faction.members, ...faction.prisoners])
      .filter(character => {
        if (retainedCharacterIds.has(character.id)) return false
        retainedCharacterIds.add(character.id)
        return true
      })

    normalized = {
      ...state,
      factions: survivingFactions,
      placements: state.placements.filter(p => !defunctFactionIds.has(p.factionId)),
      wanderers: [...state.wanderers, ...displacedCharacters],
    }
  }

  const playerFaction = normalized.factions.find(f => f.id === normalized.playerFactionId)
  if (!playerFaction) return normalized

  if (playerFaction.territories.length === 0) {
    const survivingEnemy = normalized.factions.find(
      f => f.id !== normalized.playerFactionId && f.territories.length > 0,
    )
    return {
      ...normalized,
      isGameOver: true,
      winner: survivingEnemy?.id ?? 'defeat',
      phase: 'result',
    }
  }

  const requiredTerritoryIds = normalized.activeTerritoryIds.length > 0
    ? normalized.activeTerritoryIds
    : TERRITORIES.map(t => t.id)
  const playerTerritoryIds = new Set(playerFaction.territories.map(t => t.id))

  if (requiredTerritoryIds.every(id => playerTerritoryIds.has(id))) {
    return {
      ...normalized,
      isGameOver: true,
      winner: normalized.playerFactionId,
      phase: 'result',
    }
  }

  if (normalized.turnCount >= DIFFICULTY_CONFIG[normalized.difficulty].maxTurns) {
    return {
      ...normalized,
      isGameOver: true,
      winner: null,
      phase: 'result',
    }
  }

  return normalized
}
