// 천도 — 외교 시스템

import type { GameState, Faction } from './types'

/** 외교 행동 결과 */
export interface DiplomacyResult {
  success: boolean
  message: string
}

/** 동맹 제안 성공률 계산 */
function calcDiplomacyRate(state: GameState, targetFactionId: string): number {
  const player = state.factions.find(f => f.id === state.playerFactionId)!
  const target = state.factions.find(f => f.id === targetFactionId)
  if (!target) return 0

  const leader = player.members.find(m => m.id === player.leaderId)
  if (!leader) return 0

  const baseRate = 0.3
  const intellectBonus = leader.stats.intellect * 0.03
  const virtueBonus = leader.stats.virtue * 0.02

  // 관계도 보정
  const relation = player.relations[targetFactionId] ?? 0
  const relationBonus = relation * 0.005

  // 전력 차이 보정 (우리가 강하면 유리)
  const ourPower = player.members.reduce((s, m) => s + m.totalScore, 0)
  const theirPower = target.members.reduce((s, m) => s + m.totalScore, 0)
  const powerRatio = ourPower / Math.max(theirPower, 1)
  const powerBonus = Math.min(0.2, (powerRatio - 1) * 0.1)

  // 명성 보정 (최대 +15%)
  const fameBonus = Math.min(0.15, player.fame * 0.00015)

  return Math.min(0.95, Math.max(0.05, baseRate + intellectBonus + virtueBonus + relationBonus + powerBonus + fameBonus))
}

/** 동맹 제안 */
export function commandAlliance(state: GameState, targetFactionId: string): { state: GameState; result: DiplomacyResult } {
  const COST = 200
  const player = state.factions.find(f => f.id === state.playerFactionId)!
  if (player.resources.gold < COST) {
    return { state, result: { success: false, message: '금화가 부족하다.' } }
  }

  const target = state.factions.find(f => f.id === targetFactionId)
  if (!target) return { state, result: { success: false, message: '대상 세력을 찾을 수 없다.' } }

  const rate = calcDiplomacyRate(state, targetFactionId)
  const success = Math.random() < rate

  let s = {
    ...state,
    factions: state.factions.map(f =>
      f.id === state.playerFactionId
        ? { ...f, resources: { ...f.resources, gold: f.resources.gold - COST } }
        : f
    ),
  }

  if (success) {
    // 양측 관계도 +50, 명성 +3
    s = updateRelation(s, state.playerFactionId, targetFactionId, 50)
    s = addFameToFaction(s, state.playerFactionId, 3)
    s = { ...s, log: [...s.log, `${target.name}과 동맹 체결! (명성 +3)`] }
  } else {
    // 관계도 소폭 하락
    s = updateRelation(s, state.playerFactionId, targetFactionId, -10)
    s = { ...s, log: [...s.log, `${target.name}이 동맹을 거부했다.`] }
  }

  return {
    state: s,
    result: { success, message: success ? `${target.name}과 동맹을 체결했다!` : `${target.name}이 거부했다. (성공률 ${Math.round(rate * 100)}%)` },
  }
}

/** 정전 협정 */
export function commandCeasefire(state: GameState, targetFactionId: string): { state: GameState; result: DiplomacyResult } {
  const COST = 100
  const player = state.factions.find(f => f.id === state.playerFactionId)!
  if (player.resources.gold < COST) {
    return { state, result: { success: false, message: '금화가 부족하다.' } }
  }

  const target = state.factions.find(f => f.id === targetFactionId)
  if (!target) return { state, result: { success: false, message: '대상 세력을 찾을 수 없다.' } }

  const rate = calcDiplomacyRate(state, targetFactionId) + 0.1 // 정전은 동맹보다 쉬움
  const success = Math.random() < Math.min(0.95, rate)

  let s = {
    ...state,
    factions: state.factions.map(f =>
      f.id === state.playerFactionId
        ? { ...f, resources: { ...f.resources, gold: f.resources.gold - COST } }
        : f
    ),
  }

  if (success) {
    s = updateRelation(s, state.playerFactionId, targetFactionId, 20)
    s = addFameToFaction(s, state.playerFactionId, 2)
    s = { ...s, log: [...s.log, `${target.name}과 정전 협정! (명성 +2)`] }
  } else {
    s = { ...s, log: [...s.log, `${target.name}이 정전을 거부했다.`] }
  }

  return {
    state: s,
    result: { success, message: success ? `${target.name}과 정전 협정을 맺었다!` : `${target.name}이 거부했다.` },
  }
}

/** 조공 (금/식량 전달 → 관계도 상승) */
export function commandTribute(state: GameState, targetFactionId: string, gold: number): { state: GameState; result: DiplomacyResult } {
  const player = state.factions.find(f => f.id === state.playerFactionId)!
  if (player.resources.gold < gold) {
    return { state, result: { success: false, message: '금화가 부족하다.' } }
  }

  const target = state.factions.find(f => f.id === targetFactionId)
  if (!target) return { state, result: { success: false, message: '대상 세력을 찾을 수 없다.' } }

  const relationGain = Math.floor(gold / 10)

  let s = {
    ...state,
    factions: state.factions.map(f => {
      if (f.id === state.playerFactionId) return { ...f, resources: { ...f.resources, gold: f.resources.gold - gold } }
      if (f.id === targetFactionId) return { ...f, resources: { ...f.resources, gold: f.resources.gold + gold } }
      return f
    }),
  }

  s = updateRelation(s, state.playerFactionId, targetFactionId, relationGain)
  s = { ...s, log: [...s.log, `${target.name}에 금 ${gold} 조공`] }

  return {
    state: s,
    result: { success: true, message: `${target.name}에 금 ${gold}을 보냈다. (관계 +${relationGain})` },
  }
}

/** 항복 권유 (상대 전력 30% 이하) */
export function commandSurrender(state: GameState, targetFactionId: string): { state: GameState; result: DiplomacyResult } {
  const player = state.factions.find(f => f.id === state.playerFactionId)!
  const target = state.factions.find(f => f.id === targetFactionId)
  if (!target) return { state, result: { success: false, message: '대상 세력을 찾을 수 없다.' } }

  const ourPower = player.members.reduce((s, m) => s + m.totalScore, 0)
  const theirPower = target.members.reduce((s, m) => s + m.totalScore, 0)

  if (theirPower > ourPower * 0.3) {
    return { state, result: { success: false, message: '상대 전력이 아직 높다. (30% 이하일 때 가능)' } }
  }

  const rate = 0.4 + (1 - theirPower / Math.max(ourPower, 1)) * 0.4
  const success = Math.random() < rate

  if (!success) {
    return {
      state: { ...state, log: [...state.log, `${target.name}이 항복을 거부했다.`] },
      result: { success: false, message: `${target.name}이 항복을 거부했다.` },
    }
  }

  // 항복 수락: 영토/멤버 흡수
  const s: GameState = {
    ...state,
    factions: state.factions.map(f => {
      if (f.id === state.playerFactionId) {
        return {
          ...f,
          members: [...f.members, ...target.members],
          territories: [...f.territories, ...target.territories],
          resources: {
            gold: f.resources.gold + target.resources.gold,
            food: f.resources.food + target.resources.food,
            knowledge: f.resources.knowledge + target.resources.knowledge,
            material: f.resources.material + target.resources.material,
            troops: f.resources.troops + target.resources.troops,
          },
        }
      }
      if (f.id === targetFactionId) {
        return { ...f, members: [], territories: [] }
      }
      return f
    }),
    placements: state.placements.map(p =>
      p.factionId === targetFactionId ? { ...p, factionId: state.playerFactionId } : p
    ),
    log: [...state.log, `${target.name}이 항복했다! 영토와 인재를 흡수. (명성 +10)`],
  }

  const sFame = addFameToFaction(s, state.playerFactionId, 10)

  return {
    state: sFame,
    result: { success: true, message: `${target.name}이 항복했다! (명성 +10)` },
  }
}

// ── 유틸 ──

function updateRelation(state: GameState, factionA: string, factionB: string, delta: number): GameState {
  return {
    ...state,
    factions: state.factions.map(f => {
      if (f.id === factionA) {
        const relations = { ...f.relations }
        relations[factionB] = Math.max(-100, Math.min(100, (relations[factionB] ?? 0) + delta))
        return { ...f, relations }
      }
      if (f.id === factionB) {
        const relations = { ...f.relations }
        relations[factionA] = Math.max(-100, Math.min(100, (relations[factionA] ?? 0) + delta))
        return { ...f, relations }
      }
      return f
    }),
  }
}

/** 특정 세력과의 관계도 조회 */
export function getRelation(state: GameState, factionId: string): number {
  const player = state.factions.find(f => f.id === state.playerFactionId)
  return player?.relations[factionId] ?? 0
}

/** 동맹 상태인지 확인 (관계도 50 이상) */
export function isAllied(state: GameState, factionId: string): boolean {
  return getRelation(state, factionId) >= 50
}

/** 세력 ID로 명성 증감 */
function addFameToFaction(state: GameState, factionId: string, amount: number): GameState {
  return {
    ...state,
    factions: state.factions.map(f =>
      f.id === factionId ? { ...f, fame: Math.max(0, Math.min(1000, f.fame + amount)) } : f
    ),
  }
}
