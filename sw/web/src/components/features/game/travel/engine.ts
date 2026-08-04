/**
 * 경로 잇기 (Travel) — 게임 엔진
 *
 * 핵심 책임:
 * 1. BFS로 두 인물 간 최단 경로를 계산한다.
 * 2. 도달 가능 + 최적 경로 길이가 범위 내인 출제 쌍을 찾는다.
 * 3. 이동 유효성 판정 (인접 여부).
 * 4. 채점 (예산 내 도달 = 성공, 초과분만 감점).
 *
 * DB 의존 없음 — 이미 구축된 그래프를 받아서 작동한다.
 */

import {
  BUDGET_EXTRA,
  MAX_OPTIMAL_PATH,
  MIN_OPTIMAL_PATH,
  type AdjacencyEdge,
  type TravelGraph,
  type TravelOutcome,
  type TravelPuzzle,
} from "./types";

// ─── 결정론적 난수 (날짜 시드) ───────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { getKSTDateKey as getTodayDateKey } from "@/lib/game/date-seed";

export function dateToSeed(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) | 0;
  }
  return hash;
}

/** 결정론적 셔플 */
function seededShuffle<T>(arr: readonly T[], random: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── BFS 최단 경로 ──────────────────────────────────────────

/**
 * BFS로 start → end 최단 경로를 반환한다.
 * 도달 불가 시 null.
 * 반환값: [start, ..., end] (시작·끝 포함 노드 id 배열)
 */
export function bfs(
  adjacency: Record<string, AdjacencyEdge[]>,
  startId: string,
  endId: string,
): string[] | null {
  if (startId === endId) return [startId];

  const visited = new Set<string>([startId]);
  const parent = new Map<string, string>();
  const queue: string[] = [startId];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    const neighbors = adjacency[current];
    if (!neighbors) continue;

    for (const edge of neighbors) {
      if (visited.has(edge.targetId)) continue;
      visited.add(edge.targetId);
      parent.set(edge.targetId, current);

      if (edge.targetId === endId) {
        // 경로 복원
        const path: string[] = [endId];
        let node = endId;
        while (parent.has(node)) {
          node = parent.get(node)!;
          path.unshift(node);
        }
        return path;
      }

      queue.push(edge.targetId);
    }
  }

  return null; // 도달 불가
}

// ─── 출제 쌍 생성 ────────────────────────────────────────────

/**
 * 날짜 시드를 기반으로 유효한 출제 쌍을 찾는다.
 * 유효 조건: 도달 가능 + 최적 경로 길이가 MIN~MAX 범위.
 * 최대 200번 시도 후 null.
 */
export function generatePuzzle(
  graph: TravelGraph,
  dateKey: string,
): TravelPuzzle | null {
  const seed = dateToSeed(dateKey);
  const random = mulberry32(seed);
  const celebIds = Object.keys(graph.adjacency);
  if (celebIds.length < 10) return null;

  const shuffled = seededShuffle(celebIds, random);

  for (let attempt = 0; attempt < 200; attempt++) {
    const startIdx = Math.floor(random() * shuffled.length);
    const endIdx = Math.floor(random() * shuffled.length);
    if (startIdx === endIdx) continue;

    const startId = shuffled[startIdx];
    const endId = shuffled[endIdx];

    // 간선이 없는 노드는 건너뛴다
    if (!graph.adjacency[startId]?.length) continue;
    if (!graph.adjacency[endId]?.length) continue;

    const path = bfs(graph.adjacency, startId, endId);
    if (!path) continue;

    // 최적 경로 길이 (이동 횟수 = 노드 수 - 1)
    const optimalLength = path.length - 1;
    if (optimalLength < MIN_OPTIMAL_PATH || optimalLength > MAX_OPTIMAL_PATH) continue;

    return {
      startId,
      endId,
      optimalLength,
      budget: optimalLength + BUDGET_EXTRA,
    };
  }

  return null;
}

// ─── 이동 판정 ──────────────────────────────────────────────

/** 현재 인물에서 target으로 이동 가능한지 + 이유 반환 */
export function getEdgeTo(
  adjacency: Record<string, AdjacencyEdge[]>,
  fromId: string,
  toId: string,
): AdjacencyEdge | null {
  const neighbors = adjacency[fromId];
  if (!neighbors) return null;
  return neighbors.find((e) => e.targetId === toId) ?? null;
}

/** 현재 위치의 이웃 목록 (화면 표시용) */
export function getNeighbors(
  adjacency: Record<string, AdjacencyEdge[]>,
  fromId: string,
): AdjacencyEdge[] {
  return adjacency[fromId] ?? [];
}

// ─── 채점 ────────────────────────────────────────────────────

/**
 * Travle식 채점: 목표는 최단이 아니라 도달.
 * - 예산 내 도달: 100점 - (사용한 이동 - 최적) × 10
 * - 예산 초과 도달: 30점 고정
 * - 포기: 0점
 */
export function calculateScore(
  outcome: TravelOutcome,
  pathLength: number,
  optimalLength: number,
  budget: number,
): number {
  if (outcome === "give_up") return 0;
  if (pathLength <= budget) {
    const excess = pathLength - optimalLength;
    return Math.max(40, 100 - excess * 10);
  }
  // 예산 초과지만 도달
  return 30;
}
