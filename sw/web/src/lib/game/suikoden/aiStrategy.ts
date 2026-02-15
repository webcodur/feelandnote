// 천도 — AI 전략 행동

import type { GameState, Faction, Territory, TerritoryId, GameCharacter } from './types'
import { BUILDINGS, TERRITORIES } from './constants'
import { shuffle } from './utils'

export interface AIAction {
  type: 'build' | 'recruit' | 'invade' | 'fortify' | 'idle'
  detail: string
}

// ── AI 전략 턴 실행 ──

export function executeAIStrategyTurn(state: GameState): GameState {
  let s = { ...state, factions: state.factions.map(f => ({ ...f })) }

  for (const faction of s.factions) {
    if (faction.id === s.playerFactionId) continue
    if (faction.territories.length === 0) continue

    const actions = decideActions(faction, s)
    for (const action of actions) {
      s = applyAIAction(s, faction.id, action)
    }
  }

  return s
}

// ── 행동 결정 ──

function decideActions(faction: Faction, state: GameState): AIAction[] {
  const actions: AIAction[] = []
  const personality = faction.aiPersonality ?? 'conqueror'

  // 1. 건설 (경제/방어 우선)
  if (faction.resources.gold >= 150) {
    const buildAction = decideBuild(faction, personality)
    if (buildAction) actions.push(buildAction)
  }

  // 2. 병사 모집 (병영이 있고 식량 충분하면)
  const hasBarracks = faction.territories.some(t =>
    t.buildings.some(b => b.def.id === 'barracks' && b.turnsLeft === 0)
  )
  if (hasBarracks && faction.resources.food > 100) {
    actions.push({ type: 'recruit', detail: '병사 모집' })
  }

  // 3. 침공 판단
  if (shouldInvade(faction, state, personality)) {
    const target = pickInvasionTarget(faction, state)
    if (target) {
      actions.push({ type: 'invade', detail: target })
    }
  }

  // 4. 무주지 확장
  const claimable = getClaimableTerritories(faction, state)
  if (claimable.length > 0 && Math.random() < 0.4) {
    actions.push({ type: 'invade', detail: `claim:${claimable[0]}` })
  }

  return actions
}

// ── 건설 결정 ──

function decideBuild(faction: Faction, personality: string): AIAction | null {
  const territory = faction.territories[0]
  if (!territory) return null

  const existingIds = new Set(territory.buildings.map(b => b.def.id))

  // 성격별 우선순위
  const priorities: Record<string, string[]> = {
    conqueror:  ['barracks', 'training', 'armory', 'farm'],
    schemer:    ['academy', 'library', 'temple', 'farm'],
    economist:  ['market', 'trade', 'farm', 'lumber'],
    virtuous:   ['temple', 'theater', 'farm', 'library'],
    culturist:  ['theater', 'library', 'farm', 'market'],
  }

  const pList = priorities[personality] ?? priorities.economist
  for (const bId of pList) {
    if (existingIds.has(bId)) continue
    const bDef = BUILDINGS.find(b => b.id === bId)
    if (!bDef) continue
    if (faction.resources.gold < bDef.costGold) continue
    if (faction.resources.material < bDef.costMaterial) continue
    return { type: 'build', detail: bId }
  }

  return null
}

// ── 침공 결정 ──

function shouldInvade(faction: Faction, state: GameState, personality: string): boolean {
  const totalTroops = faction.members.reduce((s, m) => s + m.troops, 0)
  const thresholds: Record<string, number> = {
    conqueror: 500, schemer: 800, economist: 1000, virtuous: 1200, culturist: 1200,
  }
  const threshold = thresholds[personality] ?? 800
  return totalTroops >= threshold && Math.random() < (personality === 'conqueror' ? 0.5 : 0.25)
}

function pickInvasionTarget(faction: Faction, state: GameState): string | null {
  const myTerritoryIds = new Set(faction.territories.map(t => t.id))
  const neighbors: TerritoryId[] = []

  for (const territory of faction.territories) {
    const def = TERRITORIES.find(td => td.id === territory.id)
    if (!def) continue
    for (const nId of def.neighbors) {
      if (myTerritoryIds.has(nId)) continue
      // 적이 점유한 영토
      const enemy = state.factions.find(f =>
        f.id !== faction.id && f.territories.some(t => t.id === nId)
      )
      if (enemy) neighbors.push(nId)
    }
  }

  if (neighbors.length === 0) return null
  return neighbors[Math.floor(Math.random() * neighbors.length)]
}

function getClaimableTerritories(faction: Faction, state: GameState): TerritoryId[] {
  const allOccupied = new Set<TerritoryId>()
  for (const f of state.factions) {
    for (const t of f.territories) allOccupied.add(t.id)
  }

  const claimable: TerritoryId[] = []
  for (const territory of faction.territories) {
    const def = TERRITORIES.find(td => td.id === territory.id)
    if (!def) continue
    for (const nId of def.neighbors) {
      if (!allOccupied.has(nId)) claimable.push(nId)
    }
  }
  return claimable
}

// ── 행동 적용 ──

function applyAIAction(state: GameState, factionId: string, action: AIAction): GameState {
  const fIndex = state.factions.findIndex(f => f.id === factionId)
  if (fIndex === -1) return state

  const faction = { ...state.factions[fIndex] }
  const factions = [...state.factions]
  factions[fIndex] = faction

  switch (action.type) {
    case 'build': {
      const bDef = BUILDINGS.find(b => b.id === action.detail)
      if (!bDef || faction.territories.length === 0) break
      if (faction.resources.gold < bDef.costGold) break
      faction.resources = {
        ...faction.resources,
        gold: faction.resources.gold - bDef.costGold,
        material: faction.resources.material - bDef.costMaterial,
      }
      const territories = faction.territories.map((t, i) =>
        i === 0 ? { ...t, buildings: [...t.buildings, { def: bDef, assigneeId: null, turnsLeft: bDef.buildTurns }] } : t
      )
      faction.territories = territories
      break
    }

    case 'recruit': {
      // 병사 배분 (가장 적은 인원에게)
      const totalRecruit = Math.min(100, faction.resources.food)
      faction.resources = { ...faction.resources, food: faction.resources.food - totalRecruit }
      faction.members = faction.members.map(m => ({
        ...m,
        troops: Math.min(m.maxTroops, m.troops + Math.floor(totalRecruit / faction.members.length)),
      }))
      break
    }

    case 'invade': {
      if (action.detail.startsWith('claim:')) {
        // 무주지 점령 - initGame에서 createTerritory 필요, 여기서는 엔진 호출
        // 실제 점령은 engine.ts에서 처리
      }
      // 전투 개시는 engine.ts에서 처리
      break
    }
  }

  return { ...state, factions }
}
