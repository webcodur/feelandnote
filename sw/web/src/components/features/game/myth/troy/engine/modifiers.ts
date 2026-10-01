/*
  파일명: components/features/game/myth/troy/engine/modifiers.ts
  기능: 트로이 전쟁 인연·맞수·적진의 벗·곁 기술 판정
  책임: DB 관계에서 만든 인연(bond)·맞수(rival)와 장 규칙의 적진의 벗(truce), 곁에 선 같은 편의 기술(일곱 겹 방패 등)을 찾는다.
        전투 계산(combatCalc)과 AI가 같은 판정을 쓴다.
*/ // ------------------------------
import type { BattleState } from "./battleTypes";
import { alliesNear, hasSkill } from "./grid";
import type { Bond, Point, SkillKey, Unit } from "./types";

function pairOf(bond: Bond, a: string, b: string): boolean {
  return (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a);
}

// 두 장수 사이의 관계(인물 slug로 본다)
export function bondBetween(state: BattleState, a: Unit, b: Unit, kind: Bond["kind"]): Bond | null {
  if (!a.figureSlug || !b.figureSlug) return null;
  const sa = a.figureSlug;
  const sb = b.figureSlug;
  return state.bonds.find((bond) => bond.kind === kind && pairOf(bond, sa, sb)) ?? null;
}

// at 곁(1칸)에 인연으로 이어진 같은 편이 있으면 그 인물 slug
export function bondedNear(state: BattleState, unit: Unit, at: Point): string | null {
  const friend = alliesNear(state, unit, at, 1).find((ally) => bondBetween(state, unit, ally, "bond"));
  return friend?.figureSlug ?? null;
}

export function areRivals(state: BattleState, a: Unit, b: Unit): Bond | null {
  return bondBetween(state, a, b, "rival");
}

// 판 안에서 처음 맞붙는 맞수 쌍의 기록 키
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

// 적진의 벗 — 서로 치지 않는다
export function inTruce(state: BattleState, a: Unit, b: Unit): boolean {
  const ids = [a.figureSlug ?? a.id, b.figureSlug ?? b.id];
  return state.rules.some((rule) => rule.kind === "truce" && rule.pairs.some(([x, y]) => ids.includes(x) && ids.includes(y) && x !== y));
}

// at에서 r칸 안의 같은 편 가운데 skill을 가진 장수가 있나(자기 자신은 뺀다)
export function auraNear(state: BattleState, unit: Unit, at: Point, skill: SkillKey, r: number): boolean {
  return alliesNear(state, unit, at, r).some((ally) => hasSkill(ally, skill));
}

// at 곁(1칸)에 slug 인물이 같은 편으로 서 있나
export function besideFigure(state: BattleState, unit: Unit, at: Point, slug: string): boolean {
  return alliesNear(state, unit, at, 1).some((ally) => ally.figureSlug === slug);
}

// 곁(1칸)에 guarding 상태인 같은 편이 있나
export function guardedNear(state: BattleState, unit: Unit, at: Point): boolean {
  return alliesNear(state, unit, at, 1).some((ally) => ally.statuses.some((s) => s.key === "guarding"));
}
