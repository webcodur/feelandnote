// 천도 — A* 경로탐색

import type { Position, TerritoryMap } from './types'
import { TERRAIN_MOVE_TICKS } from './constants'

interface Node {
  x: number
  y: number
  g: number  // 시작~현재 비용
  f: number  // g + h (총 추정 비용)
  parent: Node | null
}

/** A* 경로탐색. 16×12 그리드용. 이동 불가 시 빈 배열 반환. */
export function findPath(
  start: Position,
  goal: Position,
  map: TerritoryMap,
): Position[] {
  if (start.x === goal.x && start.y === goal.y) return []

  const { grid, width, height } = map
  const goalTerrain = grid[goal.y]?.[goal.x]?.terrain
  if (!goalTerrain || TERRAIN_MOVE_TICKS[goalTerrain] >= 999) return []

  const open: Node[] = [{ x: start.x, y: start.y, g: 0, f: heuristic(start, goal), parent: null }]
  const closed = new Set<string>()

  while (open.length > 0) {
    // 최소 f 노드 선택
    let bestIdx = 0
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i
    }
    const current = open[bestIdx]
    open.splice(bestIdx, 1)

    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(current)
    }

    const key = `${current.x},${current.y}`
    if (closed.has(key)) continue
    closed.add(key)

    // 4방향 탐색
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = current.x + dx
      const ny = current.y + dy
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue

      const nKey = `${nx},${ny}`
      if (closed.has(nKey)) continue

      const terrain = grid[ny][nx].terrain
      const cost = TERRAIN_MOVE_TICKS[terrain]
      if (cost >= 999) continue

      const g = current.g + cost
      const f = g + heuristic({ x: nx, y: ny }, goal)

      // 이미 open에 더 좋은 경로가 있는지 확인
      const existing = open.find(n => n.x === nx && n.y === ny)
      if (existing && existing.g <= g) continue
      if (existing) {
        existing.g = g
        existing.f = f
        existing.parent = current
      } else {
        open.push({ x: nx, y: ny, g, f, parent: current })
      }
    }
  }

  return [] // 도달 불가
}

function heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function reconstructPath(node: Node): Position[] {
  const path: Position[] = []
  let current: Node | null = node
  while (current?.parent) {
    path.push({ x: current.x, y: current.y })
    current = current.parent
  }
  path.reverse()
  return path
}
