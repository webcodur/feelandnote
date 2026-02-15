// 천도 — AI 실시간 행동

import type { GameState, Faction, TerritoryId, CharacterPlacement, Position } from './types'
import { BUILDINGS, TERRITORIES } from './constants'
import { findPath } from './pathfinding'
import { generateTerritoryMap } from './mapGenerator'
import { shuffle } from './utils'

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

  // 3. 병사 모집 (병영 가동 중이면)
  const hasBarracks = faction.territories.some(t =>
    t.buildings.some(b => b.def.id === 'barracks' && b.turnsLeft === 0)
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

// ── idle 캐릭터에게 근무/순찰 배정 ──

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

    // 가동 중 건물에 근무자 없으면 배정
    const activeBuildings = territory.buildings.filter(b => b.turnsLeft === 0 && !b.assigneeId)
    if (activeBuildings.length > 0) {
      // 건물 위치 찾기 (맵에서)
      const buildingTile = findBuildingTile(territory, activeBuildings[0].def.id)
      if (buildingTile) {
        const path = findPath(
          { x: placement.x, y: placement.y },
          buildingTile,
          territory.map,
        )
        if (path.length > 0 || (placement.x === buildingTile.x && placement.y === buildingTile.y)) {
          const isNear = Math.abs(placement.x - buildingTile.x) + Math.abs(placement.y - buildingTile.y) <= 1
          s = {
            ...s,
            placements: s.placements.map(p =>
              p.characterId === placement.characterId
                ? { ...p, task: isNear ? 'working' as const : 'moving' as const, path: isNear ? [] : path, taskProgress: 0, taskTargetPos: buildingTile }
                : p
            ),
          }
          continue
        }
      }
    }

    // 건물 없으면 순찰
    if (Math.random() < 0.3) {
      const townTiles: Position[] = []
      for (const row of territory.map.grid) {
        for (const tile of row) {
          if (tile.terrain === 'town') townTiles.push({ x: tile.x, y: tile.y })
        }
      }
      if (townTiles.length > 0) {
        const target = townTiles[Math.floor(Math.random() * townTiles.length)]
        const path = findPath({ x: placement.x, y: placement.y }, target, territory.map)
        if (path.length > 0) {
          s = {
            ...s,
            placements: s.placements.map(p =>
              p.characterId === placement.characterId
                ? { ...p, task: 'patrolling' as const, path, taskProgress: 0 }
                : p
            ),
          }
        }
      }
    }
  }

  return s
}

function findBuildingTile(territory: { map: { grid: { x: number; y: number; building: { defId: string } | null }[][] } }, defId: string): Position | null {
  for (const row of territory.map.grid) {
    for (const tile of row) {
      if (tile.building?.defId === defId) return { x: tile.x, y: tile.y }
    }
  }
  return null
}

// ── 건설 ──

function aiBuild(state: GameState, faction: Faction, personality: string): GameState {
  const territory = faction.territories[0]
  if (!territory) return state

  const existingIds = new Set(territory.buildings.map(b => b.def.id))

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

    // 건설 위치: town 근처 빈 타일
    const buildPos = findEmptyNearTown(territory)
    if (!buildPos) break

    // 자원 차감 + 건설 사이트 생성
    const factions = state.factions.map(f =>
      f.id === faction.id
        ? { ...f, resources: { ...f.resources, gold: f.resources.gold - bDef.costGold, material: f.resources.material - bDef.costMaterial } }
        : f
    )

    const path = findPath({ x: builder.x, y: builder.y }, buildPos, territory.map)
    const isNear = Math.abs(builder.x - buildPos.x) + Math.abs(builder.y - buildPos.y) <= 1

    return {
      ...state,
      factions,
      constructions: [...state.constructions, {
        id: `cs_ai_${Date.now()}_${builder.characterId}`,
        buildingDefId: bId,
        workerId: builder.characterId,
        territoryId: territory.id,
        x: buildPos.x,
        y: buildPos.y,
        progress: 0,
        totalTicks: bDef.buildTurns * 720,
      }],
      placements: state.placements.map(p =>
        p.characterId === builder.characterId
          ? { ...p, task: isNear ? 'building' as const : 'moving' as const, path: isNear ? [] : path, taskProgress: 0, taskTargetBuildingDefId: bId, taskTargetPos: buildPos }
          : p
      ),
    }
  }

  return state
}

function findEmptyNearTown(territory: { map: { grid: { x: number; y: number; terrain: string; building: { defId: string } | null }[][] } }): Position | null {
  const townTiles: Position[] = []
  for (const row of territory.map.grid) {
    for (const tile of row) {
      if (tile.terrain === 'town') townTiles.push({ x: tile.x, y: tile.y })
    }
  }
  if (townTiles.length === 0) return null

  // town 인접 빈 타일 찾기
  for (const town of townTiles) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = town.x + dx
      const ny = town.y + dy
      const tile = territory.map.grid[ny]?.[nx]
      if (!tile) continue
      if (tile.building) continue
      if (tile.terrain === 'wall' || tile.terrain === 'sea' || tile.terrain === 'mountain') continue
      return { x: nx, y: ny }
    }
  }
  return null
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
          id: nId,
          name: TERRITORIES.find(t => t.id === nId)?.name ?? '미지',
          regionId: TERRITORIES.find(t => t.id === nId)?.regionId ?? 'mediterranean' as const,
          buildings: [],
          map: generateTerritoryMap(nId),
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

  // 침공 대상은 StrategyScreen에서 전투 초기화할 때 처리
  // 여기서는 침공 플래그만 설정 (실시간에선 바로 전투 진입)
  const targetId = neighbors[Math.floor(Math.random() * neighbors.length)]
  const targetName = TERRITORIES.find(t => t.id === targetId)?.name ?? '미지'

  return {
    ...state,
    log: [...state.log, `${faction.name}이(가) ${targetName}에 침공을 준비 중...`],
  }
}
