/*
  파일명: components/features/game/myth/troy/engine/path.ts
  기능: 트로이 전쟁 이동 범위와 길 찾기
  책임: 지형 비용·높이 제한·성문·장수 막힘을 따져 갈 수 있는 칸(다익스트라)과 길을 구하고,
        AI가 먼 목표 쪽으로 다가가도록 목표에서 퍼지는 거리장(distanceField)을 만든다.
*/ // ------------------------------
import type { BattleState } from "./battleTypes";
import { allied, blockedByDecor, hasStatus, neighbors, pointOf, tileAt, tileIndex, unitAt, unitById } from "./grid";
import { BONUS, CLASSES, GATE_OPEN_FLAG, MAX_CLIMB, TERRAIN } from "./tables";
import type { Point, Unit } from "./types";

export interface ReachNode {
  cost: number;
  prev: number;
}

// from에서 이웃 to로 한 걸음 가는 비용. 못 가면 null
export function stepCost(state: BattleState, unit: Unit, from: Point, to: Point): number | null {
  const a = tileAt(state.map, from);
  const b = tileAt(state.map, to);
  if (!a || !b) return null;
  if (b.terrain === "gate" && !state.flags.includes(GATE_OPEN_FLAG)) return null;
  if (blockedByDecor(state.map, to)) return null;
  const move = CLASSES[unit.classKey].move;
  const base = TERRAIN[b.terrain].cost[move];
  if (base === null) return null;
  if (move === "flying") return base;
  const rise = b.height - a.height;
  if (Math.abs(rise) > MAX_CLIMB) return null;
  return base + (rise > 0 ? (move === "wheels" ? 2 : 1) : 0);
}

// 이번 차례에 쓸 수 있는 이동력
export function moveBudget(unit: Unit): number {
  if (hasStatus(unit, "rooted")) return 0;
  const carry = hasStatus(unit, "carrying") ? BONUS.carryingMov : 0;
  return Math.max(0, unit.stats.mov - carry);
}

// 다익스트라 — 적이 선 칸은 못 지나고, 같은 편 칸은 지나가되 멈추지 못한다(멈춤은 reachable이 거른다)
export function reachMap(state: BattleState, unit: Unit, budget = moveBudget(unit)): Map<number, ReachNode> {
  const map = state.map;
  const start = tileIndex(map, unit);
  const nodes = new Map<number, ReachNode>([[start, { cost: 0, prev: -1 }]]);
  const open: number[] = [start];
  while (open.length > 0) {
    open.sort((a, b) => (nodes.get(a)?.cost ?? 0) - (nodes.get(b)?.cost ?? 0));
    const current = open.shift() as number;
    const here = pointOf(map, current);
    const cost = nodes.get(current)?.cost ?? 0;
    for (const next of neighbors(map, here)) {
      const blocker = unitAt(state, next);
      if (blocker && !allied(blocker.side, unit.side)) continue;
      const step = stepCost(state, unit, here, next);
      if (step === null || cost + step > budget) continue;
      const id = tileIndex(map, next);
      const known = nodes.get(id);
      if (known && known.cost <= cost + step) continue;
      nodes.set(id, { cost: cost + step, prev: current });
      if (!open.includes(id)) open.push(id);
    }
  }
  return nodes;
}

// 멈출 수 있는 칸(비어 있거나 자기 자리)
export function reachable(state: BattleState, unitId: string): Point[] {
  const unit = unitById(state, unitId);
  if (!unit) return [];
  const out: Point[] = [];
  for (const id of reachMap(state, unit).keys()) {
    const p = pointOf(state.map, id);
    const other = unitAt(state, p);
    if (!other || other.id === unit.id) out.push(p);
  }
  return out;
}

// 출발 칸부터 to까지(둘 다 넣는다). 못 가면 null
export function pathTo(state: BattleState, unitId: string, to: Point): Point[] | null {
  const unit = unitById(state, unitId);
  if (!unit) return null;
  const nodes = reachMap(state, unit);
  let id = tileIndex(state.map, to);
  if (!nodes.has(id)) return null;
  const other = unitAt(state, to);
  if (other && other.id !== unit.id) return null;
  const path: Point[] = [];
  while (id !== -1) {
    path.unshift(pointOf(state.map, id));
    id = nodes.get(id)?.prev ?? -1;
  }
  return path;
}

// sources에서 퍼지는 걸음 비용(장수 막힘은 보지 않는다). 못 닿는 칸은 Infinity
export function distanceField(state: BattleState, unit: Unit, sources: Point[]): number[] {
  const map = state.map;
  const dist: number[] = Array.from({ length: map.width * map.height }, () => Infinity);
  const open: number[] = [];
  for (const p of sources) {
    const id = tileIndex(map, p);
    dist[id] = 0;
    open.push(id);
  }
  while (open.length > 0) {
    open.sort((a, b) => dist[a] - dist[b]);
    const current = open.shift() as number;
    const here = pointOf(map, current);
    for (const next of neighbors(map, here)) {
      // 거꾸로 퍼지므로 next에서 here로 걸어오는 비용을 쓴다
      const step = stepCost(state, unit, next, here);
      const id = tileIndex(map, next);
      if (step === null || dist[current] + step >= dist[id]) continue;
      dist[id] = dist[current] + step;
      if (!open.includes(id)) open.push(id);
    }
  }
  return dist;
}
