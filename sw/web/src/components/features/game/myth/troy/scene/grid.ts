/*
  파일명: components/features/game/myth/troy/scene/grid.ts
  기능: 칸 좌표·높이 계산과 시드 난수
  책임: 칸 (x, y)를 월드 좌표로 옮기는 식, 칸 윗면·물 면·말이 서는 높이, 칸마다 늘 같은 값을 내는 해시를 한곳에서 정한다.
*/ // ------------------------------
import { Vector3 } from "three";
import type { BattleMap, Point, TerrainKind, Tile } from "../engine/types";

// #region 높이
// 한 단 높이, 칸 기둥 바닥(받침 윗면), 물 면이 뭍보다 낮은 정도
export const STEP = 0.4;
export const FLOOR_Y = -0.6;
const WATER_DROP = 0.05;
const TOP_OFFSET: Partial<Record<TerrainKind, number>> = { water: -0.25, shallow: -0.1, trench: -0.15 };

export const isWet = (terrain: TerrainKind) => terrain === "water" || terrain === "shallow";

export function tileAt(map: BattleMap, x: number, y: number): Tile | null {
  const out = x < 0 || y < 0 || x >= map.width || y >= map.height;
  return out ? null : (map.tiles[y * map.width + x] ?? null);
}

export const topY = (tile: Tile) => tile.height * STEP + (TOP_OFFSET[tile.terrain] ?? 0);
export const waterY = (tile: Tile) => tile.height * STEP - WATER_DROP;
// 강조·커서·길이 눕는 높이(물이면 물 면)
export const surfaceY = (tile: Tile) => (isWet(tile.terrain) ? Math.max(topY(tile), waterY(tile)) : topY(tile));
// 말이 서는 높이: 여울은 바닥에 발을 담그고, 깊은 물은 물 면에 떠 있다
export const standY = (tile: Tile) => (tile.terrain === "water" ? waterY(tile) - 0.03 : topY(tile));

export function maxTop(map: BattleMap): number {
  return map.tiles.reduce((m, t) => Math.max(m, topY(t)), 0);
}
// #endregion

// #region 좌표
export const worldX = (map: BattleMap, x: number) => x + 0.5 - map.width / 2;
export const worldZ = (map: BattleMap, y: number) => y + 0.5 - map.height / 2;

// 칸 윗면 가운데(강조·말풍선 기준)
export function surfaceAt(map: BattleMap, p: Point, out = new Vector3()): Vector3 {
  const tile = tileAt(map, p.x, p.y);
  return out.set(worldX(map, p.x), tile ? surfaceY(tile) : 0, worldZ(map, p.y));
}

// 말이 서는 자리
export function standAt(map: BattleMap, p: Point, out = new Vector3()): Vector3 {
  const tile = tileAt(map, p.x, p.y);
  return out.set(worldX(map, p.x), tile ? standY(tile) : 0, worldZ(map, p.y));
}

export const tileKey = (x: number, y: number) => `${x},${y}`;
// #endregion

// #region 방향
// facing·rot: 0=+y 1=+x 2=-y 3=-x. 모델 앞이 +Z라 y축으로 facing×90° 돌리면 된다
export const DIRS: Point[] = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }];
export const facingAngle = (facing: number) => (facing * Math.PI) / 2;

export function dirOf(dx: number, dy: number): 0 | 1 | 2 | 3 {
  return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 1 : 3) : dy >= 0 ? 0 : 2;
}

// 월드 방향(x, z)을 바라보게 하는 y축 회전
export const angleToward = (dx: number, dz: number) => Math.atan2(dx, dz);

// 지금 각에서 목표 각으로 가장 짧게 도는 끝 각
export function nearestAngle(from: number, to: number): number {
  const full = Math.PI * 2;
  const turn = ((((to - from + Math.PI) % full) + full) % full) - Math.PI;
  return from + turn;
}
// #endregion

// #region 시드 난수
// 칸마다 늘 같은 0~1 값
export function hash2(x: number, y: number, salt = 0): number {
  let h = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1442695041, 2246822519) ^ Math.imul(salt + 3266489917, 374761393);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// #endregion
