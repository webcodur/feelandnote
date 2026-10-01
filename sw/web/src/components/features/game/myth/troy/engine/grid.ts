/*
  파일명: components/features/game/myth/troy/engine/grid.ts
  기능: 트로이 전쟁 판의 칸·장수 찾기
  책임: 칸 번호·범위·이웃·거리, 판 위 장수 찾기, 편 가르기처럼 모든 규칙이 함께 쓰는 작은 도구를 둔다.
*/ // ------------------------------
import type { BattleState } from "./battleTypes";
import type { BattleMap, Decor, DecorKind, Point, Side, SkillKey, StatusKey, Tile, Unit } from "./types";

// #region 칸
export const DIRS: readonly Point[] = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }];

export function inBounds(map: BattleMap, p: Point): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < map.width && p.y < map.height;
}

export function tileIndex(map: BattleMap, p: Point): number {
  return p.y * map.width + p.x;
}

export function pointOf(map: BattleMap, index: number): Point {
  return { x: index % map.width, y: Math.floor(index / map.width) };
}

export function tileAt(map: BattleMap, p: Point): Tile | null {
  return inBounds(map, p) ? map.tiles[tileIndex(map, p)] ?? null : null;
}

export function neighbors(map: BattleMap, p: Point): Point[] {
  return DIRS.map((d) => ({ x: p.x + d.x, y: p.y + d.y })).filter((q) => inBounds(map, q));
}

export function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function posOf(unit: Unit): Point {
  return { x: unit.x, y: unit.y };
}

export function onTiles(p: Point, tiles: Point[]): boolean {
  return tiles.some((t) => samePoint(t, p));
}

// 칸을 막는 장식(막사·천막·제단·신상·샘·탑·무덤·목마). 화로·방패 더미·창 틀은 지나간다. 배는 지형(ship)이 막는다
const BLOCKING: ReadonlySet<DecorKind> = new Set<DecorKind>(["hut", "tent", "altar", "statue", "spring", "tower", "tumulus", "horse"]);
const blockCache = new WeakMap<Decor[], Set<number>>();

function decorCover(d: Decor): Point[] {
  return d.kind === "horse"
    ? [{ x: d.x, y: d.y }, { x: d.x + 1, y: d.y }, { x: d.x, y: d.y + 1 }, { x: d.x + 1, y: d.y + 1 }]
    : [{ x: d.x, y: d.y }];
}

export function blockedByDecor(map: BattleMap, p: Point): boolean {
  let blocked = blockCache.get(map.decor);
  if (!blocked) {
    blocked = new Set(map.decor.filter((d) => BLOCKING.has(d.kind)).flatMap(decorCover).map((q) => q.y * map.width + q.x));
    blockCache.set(map.decor, blocked);
  }
  return blocked.has(p.y * map.width + p.x);
}
// #endregion

// #region 장수
export function unitById(state: BattleState, id: string): Unit | null {
  return state.units.find((u) => u.id === id) ?? null;
}

export function unitAt(state: BattleState, p: Point): Unit | null {
  return state.units.find((u) => u.x === p.x && u.y === p.y) ?? null;
}

// player와 ally는 한편이다
export function allied(a: Side, b: Side): boolean {
  return (a === "enemy") === (b === "enemy");
}

export function sideUnits(state: BattleState, side: Side): Unit[] {
  return state.units.filter((u) => u.side === side);
}

// 곁(맨해튼 r칸 안)의 같은 편. 자기 자신은 뺀다
export function alliesNear(state: BattleState, unit: Unit, at: Point, r = 1): Unit[] {
  return state.units.filter((u) => u.id !== unit.id && allied(u.side, unit.side) && manhattan(posOf(u), at) <= r);
}

export function hasStatus(unit: Unit, key: StatusKey): boolean {
  return unit.statuses.some((s) => s.key === key);
}

export function hasSkill(unit: Unit, key: SkillKey): boolean {
  return unit.skills.includes(key);
}

// 판에서 빠졌나(쓰러짐·물러남 모두)
export function isOut(state: BattleState, id: string): boolean {
  return state.fallen.includes(id) || state.retreated.includes(id);
}
// #endregion
