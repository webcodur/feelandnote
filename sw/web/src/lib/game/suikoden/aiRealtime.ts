// 천도 — AI 실시간 행동

import type { GameState, Faction, TerritoryId } from './types'
import { BUILDINGS, TERRITORIES, BUILDING_CATEGORY } from './constants'
import { shuffle } from './utils'
import { commandBuild, commandAssign } from './rtEngine'

/** 매 120틱마다 호출. AI 세력들의 의사결정 실행. */
export function evaluateAIDecisions(state: GameState): GameState {
  let s = { ...state }

  for (const faction of s.factions) {
    if (faction.id === s.playerFactionId) continue
    if (faction.territories.length === 0) continue

    s = executeAIFaction(s, faction)
  }

  return s
}

function executeAIFaction(state: GameState, faction: Faction): GameState {
  let s = state
  const personality = faction.aiPersonality ?? 'conqueror'

  // 1. idle 캐릭터에게 일 부여
  s = assignIdleCharacters(s, faction)

  // 2. 건설 결정
  if (faction.resources.gold >= 150) {
    s = aiBuild(s, faction, personality)
  }

  // 3. 병사 모집
  const hasBarracks = faction.territories.some(t =>
    t.buildingCards.some(c => c.defId === 'barracks' && !c.isConstructing)
  )
  if (hasBarracks && faction.resources.food > 100) {
    s = aiRecruit(s, faction)
  }

  // 4. 무주지 확장
  s = aiExpand(s, faction)

  // 5. 침공 판단
  if (shouldInvade(faction, personality)) {
    s = aiInvade(s, faction)
  }

  return s
}

// ── idle 캐릭터에게 건물 배치 ──

/** 외부에서도 호출 가능한 범용 함수 (플레이어 자동 내정용) */
export function assignIdleCharactersForFaction(state: GameState, faction: Faction): GameState {
  return assignIdleCharacters(state, faction)
}

function assignIdleCharacters(state: GameState, faction: Faction): GameState {
  const idlePlacements = state.placements.filter(
    p => p.factionId === faction.id && p.task === 'idle'
  )
  if (idlePlacements.length === 0) return state

  let s = state

  for (const placement of idlePlacements) {
    const territory = faction.territories.find(t => t.id === placement.territoryId)
    if (!territory) continue

    // assigneeId가 null인 완성된 건물 찾기
    const unassignedCards = territory.buildingCards.filter(
      c => !c.isConstructing && !c.assigneeId
    )
    if (unassignedCards.length > 0) {
      s = commandAssign(s, placement.characterId, unassignedCards[0].instanceId)
      // faction 업데이트된 state에서 다시 찾기
      continue
    }
  }

  return s
}

// ── 건설 ──

function aiBuild(state: GameState, faction: Faction, personality: string): GameState {
  const territory = faction.territories[0]
  if (!territory) return state
  if (territory.buildingCards.length >= territory.maxBuildings) return state

  const existingIds = new Set(territory.buildingCards.map(c => c.defId))

  const priorities: Record<string, string[]> = {
    conqueror: ['barracks', 'training', 'armory', 'farm'],
    schemer: ['academy', 'library', 'temple', 'farm'],
    economist: ['market', 'trade', 'farm', 'lumber'],
    virtuous: ['temple', 'theater', 'farm', 'library'],
    culturist: ['theater', 'library', 'farm', 'market'],
  }

  const pList = priorities[personality] ?? priorities.economist
  for (const bId of pList) {
    if (existingIds.has(bId)) continue
    const bDef = BUILDINGS.find(b => b.id === bId)
    if (!bDef) continue
    if (faction.resources.gold < bDef.costGold) continue
    if (faction.resources.material < bDef.costMaterial) continue

    // 건설할 빈 캐릭터 찾기
    const builder = state.placements.find(
      p => p.factionId === faction.id && p.task === 'idle' && p.territoryId === territory.id
    )
    if (!builder) break

    return commandBuild(state, builder.characterId, bId, territory.id)
  }

  return state
}

// ── 병사 모집 ──

function aiRecruit(state: GameState, faction: Faction): GameState {
  const totalRecruit = Math.min(100, faction.resources.food)
  return {
    ...state,
    factions: state.factions.map(f =>
      f.id === faction.id
        ? {
            ...f,
            resources: { ...f.resources, food: f.resources.food - totalRecruit },
            members: f.members.map(m => ({
              ...m,
              troops: Math.min(m.maxTroops, m.troops + Math.floor(totalRecruit / f.members.length)),
            })),
          }
        : f
    ),
  }
}

// ── 무주지 확장 ──

function aiExpand(state: GameState, faction: Faction): GameState {
  const allOccupied = new Set<TerritoryId>()
  for (const f of state.factions) for (const t of f.territories) allOccupied.add(t.id)

  for (const territory of faction.territories) {
    const def = TERRITORIES.find(td => td.id === territory.id)
    if (!def) continue
    for (const nId of def.neighbors) {
      if (allOccupied.has(nId)) continue
      if (Math.random() < 0.1) {
        const newTerritory = {
          id: nId as TerritoryId,
          name: TERRITORIES.find(t => t.id === nId)?.name ?? '미지',
          regionId: TERRITORIES.find(t => t.id === nId)?.regionId ?? 'mediterranean' as const,
          buildingCards: [],
          maxBuildings: 8,
          population: 500,
          morale: 60,
          resources: { gold: 0, food: 0, knowledge: 0, material: 0, troops: 0 },
          taxRate: 'normal' as const,
        }
        return {
          ...state,
          factions: state.factions.map(f =>
            f.id === faction.id
              ? { ...f, territories: [...f.territories, newTerritory] }
              : f
          ),
          log: [...state.log, `${faction.name}이(가) ${newTerritory.name}을(를) 점령!`],
        }
      }
    }
  }
  return state
}

// ── 침공 판단 ──

function shouldInvade(faction: Faction, personality: string): boolean {
  const totalTroops = faction.members.reduce((s, m) => s + m.troops, 0)
  const thresholds: Record<string, number> = {
    conqueror: 500, schemer: 800, economist: 1000, virtuous: 1200, culturist: 1200,
  }
  return totalTroops >= (thresholds[personality] ?? 800) && Math.random() < (personality === 'conqueror' ? 0.3 : 0.1)
}

function aiInvade(state: GameState, faction: Faction): GameState {
  const myTerritoryIds = new Set(faction.territories.map(t => t.id))
  const neighbors: TerritoryId[] = []

  for (const territory of faction.territories) {
    const def = TERRITORIES.find(td => td.id === territory.id)
    if (!def) continue
    for (const nId of def.neighbors) {
      if (myTerritoryIds.has(nId)) continue
      const enemy = state.factions.find(f => f.id !== faction.id && f.territories.some(t => t.id === nId))
      if (enemy) neighbors.push(nId)
    }
  }

  if (neighbors.length === 0) return state

  const targetId = neighbors[Math.floor(Math.random() * neighbors.length)]
  const targetName = TERRITORIES.find(t => t.id === targetId)?.name ?? '미지'

  return {
    ...state,
    log: [...state.log, `${faction.name}이(가) ${targetName}에 침공을 준비 중...`],
  }
}
