import type { GameState } from './types'

export type SuikodenStartMode = 'new' | 'continue'

const SAVE_KEY = 'feelandnote:suikoden:save'
const SAVE_VERSION = 1

interface SaveEnvelope {
  version: number
  savedAt: string
  state: GameState
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<GameState>
  return typeof state.phase === 'string'
    && typeof state.playerFactionId === 'string'
    && typeof state.turnCount === 'number'
    && Array.isArray(state.factions)
    && Array.isArray(state.placements)
    && Array.isArray(state.activeTerritoryIds)
}

export function saveSuikodenGame(state: GameState): boolean {
  if (typeof window === 'undefined') return false
  const safeState: GameState = state.battle?.animation
    ? { ...state, battle: { ...state.battle, animation: null } }
    : state
  const envelope: SaveEnvelope = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state: safeState,
  }
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(envelope))
    return true
  } catch {
    // 저장 공간이 차단되거나 가득 찬 환경에서도 현재 플레이는 계속한다.
    return false
  }
}

export function loadSuikodenGame(): GameState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const envelope = JSON.parse(raw) as Partial<SaveEnvelope>
    if (envelope.version !== SAVE_VERSION || !isGameState(envelope.state)) {
      clearSuikodenGame()
      return null
    }
    return envelope.state
  } catch {
    clearSuikodenGame()
    return null
  }
}

export function hasSuikodenGame(): boolean {
  return loadSuikodenGame() !== null
}

export function clearSuikodenGame(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SAVE_KEY)
  } catch {
    // 저장소 접근이 막혀 있어도 새 게임과 결과 화면은 정상 진행한다.
  }
}
