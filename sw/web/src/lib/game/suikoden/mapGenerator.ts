// 천도 — 영토 맵 생성기

import type { TerritoryMap, TerritoryTile, Terrain, TerritoryId, RegionId, BuildingInstance } from './types'
import { REGION_TERRAIN_DIST, TERRITORIES, WALL_HP, GATE_HP } from './constants'

const MAP_WIDTH = 16
const MAP_HEIGHT = 12

// ── 시드 PRNG (외부 의존성 없음) ──

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash
}

// ── 메인 생성 함수 ──

export function generateTerritoryMap(territoryId: TerritoryId): TerritoryMap {
  const def = TERRITORIES.find(t => t.id === territoryId)
  if (!def) throw new Error(`Unknown territory: ${territoryId}`)

  const seed = hashString(territoryId)
  const rng = mulberry32(seed)
  const dist = REGION_TERRAIN_DIST[def.regionId]

  // 지형 확률 배열
  const terrainPool = buildTerrainPool(dist)

  // 그리드 생성
  const grid: TerritoryTile[][] = []
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: TerritoryTile[] = []
    for (let x = 0; x < MAP_WIDTH; x++) {
      const terrain = pickTerrain(terrainPool, rng)
      row.push({ terrain, building: null, x, y })
    }
    grid.push(row)
  }

  // 중앙에 town 배치 (3-5개)
  placeTownCluster(grid, rng)

  // town 주변에 road 연결
  placeRoads(grid)

  return { grid, width: MAP_WIDTH, height: MAP_HEIGHT }
}

// ── 성벽 생성 (건설 완료 시 호출) ──

export function addWallsToMap(map: TerritoryMap): TerritoryMap {
  const grid = map.grid.map(row => row.map(t => ({ ...t })))

  // town 타일 찾기
  const townTiles: { x: number; y: number }[] = []
  for (const row of grid) {
    for (const tile of row) {
      if (tile.terrain === 'town') townTiles.push({ x: tile.x, y: tile.y })
    }
  }

  if (townTiles.length === 0) return map

  // town 주변 1칸에 wall 배치, 입구에 gate
  const townSet = new Set(townTiles.map(t => `${t.x},${t.y}`))
  const wallPositions: { x: number; y: number }[] = []

  for (const town of townTiles) {
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = town.x + dx
      const ny = town.y + dy
      if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue
      const key = `${nx},${ny}`
      if (townSet.has(key)) continue
      if (grid[ny][nx].terrain === 'wall' || grid[ny][nx].terrain === 'gate') continue
      wallPositions.push({ x: nx, y: ny })
    }
  }

  // 벽 배치 (동서남북 중앙에 gate, 나머지 wall)
  const centerX = Math.round(townTiles.reduce((s, t) => s + t.x, 0) / townTiles.length)
  const centerY = Math.round(townTiles.reduce((s, t) => s + t.y, 0) / townTiles.length)

  for (const pos of wallPositions) {
    const isGate = (pos.x === centerX && (pos.y === centerY - 2 || pos.y === centerY + 2)) ||
                   (pos.y === centerY && (pos.x === centerX - 2 || pos.x === centerX + 2))

    grid[pos.y][pos.x] = {
      ...grid[pos.y][pos.x],
      terrain: isGate ? 'gate' : 'wall',
    }
  }

  return { grid, width: MAP_WIDTH, height: MAP_HEIGHT }
}

// ── 내부 함수 ──

function buildTerrainPool(dist: Partial<Record<Terrain, number>>): { terrain: Terrain; weight: number }[] {
  return Object.entries(dist).map(([terrain, weight]) => ({
    terrain: terrain as Terrain,
    weight: weight ?? 0,
  }))
}

function pickTerrain(pool: { terrain: Terrain; weight: number }[], rng: () => number): Terrain {
  const total = pool.reduce((s, p) => s + p.weight, 0)
  let r = rng() * total
  for (const p of pool) {
    r -= p.weight
    if (r <= 0) return p.terrain
  }
  return 'plain'
}

function placeTownCluster(grid: TerritoryTile[][], rng: () => number) {
  const cx = Math.floor(MAP_WIDTH / 2) - 1 + Math.floor(rng() * 3)
  const cy = Math.floor(MAP_HEIGHT / 2) - 1 + Math.floor(rng() * 3)
  const townCount = 3 + Math.floor(rng() * 3)

  // BFS로 town 확장
  const placed: { x: number; y: number }[] = [{ x: cx, y: cy }]
  grid[cy][cx].terrain = 'town'

  while (placed.length < townCount) {
    const base = placed[Math.floor(rng() * placed.length)]
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
    const [dx, dy] = dirs[Math.floor(rng() * 4)]
    const nx = base.x + dx
    const ny = base.y + dy
    if (nx < 1 || nx >= MAP_WIDTH - 1 || ny < 1 || ny >= MAP_HEIGHT - 1) continue
    if (grid[ny][nx].terrain === 'town') continue
    grid[ny][nx].terrain = 'town'
    placed.push({ x: nx, y: ny })
  }
}

function placeRoads(grid: TerritoryTile[][]) {
  // town에서 맵 가장자리로 도로 연결 (4방향)
  const townTiles: { x: number; y: number }[] = []
  for (const row of grid) {
    for (const tile of row) {
      if (tile.terrain === 'town') townTiles.push({ x: tile.x, y: tile.y })
    }
  }
  if (townTiles.length === 0) return

  const cx = Math.round(townTiles.reduce((s, t) => s + t.x, 0) / townTiles.length)
  const cy = Math.round(townTiles.reduce((s, t) => s + t.y, 0) / townTiles.length)

  // 위쪽 도로
  for (let y = cy - 1; y >= 0; y--) {
    if (grid[y][cx].terrain !== 'town' && grid[y][cx].terrain !== 'road') {
      grid[y][cx].terrain = 'road'
    }
  }
  // 아래쪽
  for (let y = cy + 1; y < MAP_HEIGHT; y++) {
    if (grid[y][cx].terrain !== 'town' && grid[y][cx].terrain !== 'road') {
      grid[y][cx].terrain = 'road'
    }
  }
  // 왼쪽
  for (let x = cx - 1; x >= 0; x--) {
    if (grid[cy][x].terrain !== 'town' && grid[cy][x].terrain !== 'road') {
      grid[cy][x].terrain = 'road'
    }
  }
  // 오른쪽
  for (let x = cx + 1; x < MAP_WIDTH; x++) {
    if (grid[cy][x].terrain !== 'town' && grid[cy][x].terrain !== 'road') {
      grid[cy][x].terrain = 'road'
    }
  }
}

// ── TerritoryMap → BattleTile 변환 (전투 맵으로 사용) ──

export function territoryMapToBattleGrid(tMap: TerritoryMap, hasWalls: boolean) {
  const grid = tMap.grid.map(row => row.map(tile => ({
    terrain: tile.terrain,
    building: tile.building,
    x: tile.x,
    y: tile.y,
    unit: null as any,
    wallHp: tile.terrain === 'wall' ? WALL_HP : tile.terrain === 'gate' ? GATE_HP : undefined,
    wallMaxHp: tile.terrain === 'wall' ? WALL_HP : tile.terrain === 'gate' ? GATE_HP : undefined,
  })))
  return grid
}
