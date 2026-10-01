/*
  파일명: components/features/game/myth/troy/engine/aiScore.ts
  기능: 트로이 전쟁 AI의 공격 점수와 사거리 칸
  책임: 어느 칸에서 누구를 치면 좋은지 점수로 매기고(예상 피해·쓰러뜨릴 가능성·반격 위험·지형), 한 장수가 닿는 공격 칸을 모은다.
        AI와 화면(위험 칸 보기)이 함께 쓴다.
*/ // ------------------------------
import type { BattleState } from "./battleTypes";
import { canHit, inRange, strikeCalc } from "./combatCalc";
import { allied, inBounds, pointOf, posOf, tileAt, tileIndex, unitAt, unitById } from "./grid";
import { reachMap } from "./path";
import { TERRAIN, WEAPONS } from "./tables";
import type { Point, Unit } from "./types";

// at에 선 unit이 foe를 칠 때의 점수. 쓸모없는 공격(피해 0)은 음수다
export function attackScore(state: BattleState, unit: Unit, at: Point, foe: Unit): number {
  const foeAt = posOf(foe);
  const mine = strikeCalc(state, unit, at, foe, foeAt, "attacker", null);
  const hitP = mine.hit / 100;
  const expected = mine.damage * mine.count * hitP * (1 + mine.crit / 100);
  const kill = mine.damage * mine.count >= foe.hp ? 60 * hitP : 0;
  const counters = canHit(state, foe, foeAt, unit, at) && !foe.tags.includes("noCounter");
  const back = counters ? strikeCalc(state, foe, foeAt, unit, at, "defender", null) : null;
  const risk = back ? back.damage * back.count * (back.hit / 100) * 0.5 : 0;
  const tile = tileAt(state.map, at);
  const ground = tile ? TERRAIN[tile.terrain].def * 2 + TERRAIN[tile.terrain].avoid / 10 + tile.height : 0;
  const lord = foe.tags.includes("lord") ? 10 : 0;
  const wanted = unit.ai?.targetIds?.some((id) => id === foe.id || id === foe.figureSlug) ? 40 : 0;
  const useless = mine.damage === 0 ? -40 : 0;
  return expected + kill + lord + wanted + ground * 0.5 - risk + useless;
}

// 멈출 수 있는 칸(비었거나 자기 자리)
export function standable(state: BattleState, unit: Unit, budget?: number): Point[] {
  const out: Point[] = [];
  for (const id of reachMap(state, unit, budget).keys()) {
    const p = pointOf(state.map, id);
    const other = unitAt(state, p);
    if (!other || other.id === unit.id) out.push(p);
  }
  return out;
}

// from에서 무기가 닿는 칸
export function rangeFrom(state: BattleState, unit: Unit, from: Point): Point[] {
  const max = WEAPONS[unit.weapon].max + 2;
  const out: Point[] = [];
  for (let dy = -max; dy <= max; dy += 1) {
    for (let dx = -max; dx <= max; dx += 1) {
      const p = { x: from.x + dx, y: from.y + dy };
      if (inBounds(state.map, p) && inRange(state, unit, from, p)) out.push(p);
    }
  }
  return out;
}

// 이 장수가 이번(또는 다음) 차례에 칠 수 있는 칸 전부
export function threatTiles(state: BattleState, unitId: string): Point[] {
  const unit = unitById(state, unitId);
  if (!unit || WEAPONS[unit.weapon].max === 0) return [];
  const seen = new Map<number, Point>();
  for (const at of standable(state, unit)) {
    for (const p of rangeFrom(state, unit, at)) seen.set(tileIndex(state.map, p), p);
  }
  return [...seen.values()];
}

// 한 편이 다음 차례에 칠 수 있는 칸(위험 칸 보기)
export function dangerTiles(state: BattleState, side: Unit["side"]): Point[] {
  const seen = new Map<number, Point>();
  for (const unit of state.units.filter((u) => u.side === side)) {
    for (const p of threatTiles(state, unit.id)) seen.set(tileIndex(state.map, p), p);
  }
  return [...seen.values()];
}

// from에서 칠 수 있는 상대 id
export function targetsFrom(state: BattleState, unitId: string, from: Point): string[] {
  const unit = unitById(state, unitId);
  if (!unit) return [];
  return state.units.filter((u) => !allied(u.side, unit.side) && canHit(state, unit, from, u, posOf(u))).map((u) => u.id);
}
