// 천도 v2 — 성도(星圖): 판을 넘어 쌓이는 인물 기록. 만난 인물·함께한 인물·군주로 세운 인물.

import { CODEX_KEY } from './constants'
import type { GameState } from './types'

export interface CodexEntry {
  /** 1 = 만남, 2 = 함께함 */
  level: 1 | 2
  /** 군주로 시작한 횟수 */
  lord?: number
  /** 가장 높이 받은 108성 순번 */
  star?: number
}

export type Codex = Record<string, CodexEntry>

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function readCodex(): Codex {
  const s = storage()
  if (!s) return {}
  try {
    const raw = s.getItem(CODEX_KEY)
    return raw ? (JSON.parse(raw) as Codex) : {}
  } catch {
    return {}
  }
}

function writeCodex(codex: Codex): void {
  const s = storage()
  if (!s) return
  try {
    s.setItem(CODEX_KEY, JSON.stringify(codex))
  } catch {
    // 가득 차면 다음 기회에
  }
}

/** 판의 현재 상태에서 만난 사람과 함께한 사람을 성도에 옮겨 적는다 */
export function recordCodex(state: GameState): Codex {
  const codex = readCodex()
  let changed = false
  const mark = (id: string, level: 1 | 2, star?: number | null) => {
    const cur = codex[id]
    if (!cur) { codex[id] = { level }; changed = true }
    else if (cur.level < level) { cur.level = level; changed = true }
    const entry = codex[id]
    if (star !== undefined && star !== null && (entry.star === undefined || star < entry.star)) { entry.star = star; changed = true }
  }
  if (state.wander) {
    for (const id of state.wander.met) mark(id, 1)
    for (const id of state.wander.party) mark(id, 2)
  }
  const player = state.playerFaction ? state.factions[state.playerFaction] : null
  if (player) {
    for (const id of Object.keys(player.discovered)) mark(id, 1)
  }
  for (const hs of Object.values(state.heroes)) {
    if (player && hs.faction === player.id && (hs.status === 'officer' || hs.status === 'lord')) mark(hs.id, 2, hs.star)
    if (player && hs.status === 'prisoner' && hs.faction === player.id) mark(hs.id, 1)
  }
  mark(state.lordId, 2)
  if (changed) writeCodex(codex)
  return codex
}

/** 새 판을 여는 군주를 적는다 */
export function recordLord(lordId: string): void {
  const codex = readCodex()
  const cur = codex[lordId] ?? { level: 2 as const }
  cur.level = 2
  cur.lord = (cur.lord ?? 0) + 1
  codex[lordId] = cur
  writeCodex(codex)
}
