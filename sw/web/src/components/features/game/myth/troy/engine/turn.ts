/*
  파일명: components/features/game/myth/troy/engine/turn.ts
  기능: 트로이 전쟁 행동 적용
  책임: 판 상태와 행동 하나를 받아 새 상태와 연출할 결과를 돌려준다(원래 상태는 그대로 둔다).
        행동마다 장 규칙 → 사건 → 이기고 지는 판정을 거친다. 판이 끝나면 더 받지 않는다.
*/ // ------------------------------
import type { Action, ActionResult, BattleEvent, BattleState } from "./battleTypes";
import { resolveCombat } from "./combat";
import { canHit } from "./combatCalc";
import { fireEvents } from "./events";
import { allied, manhattan, onTiles, posOf, tileIndex, unitById } from "./grid";
import { pathTo, reachMap } from "./path";
import { endPhase, openingEvents } from "./phase";
import { afterAct, afterMove, settle } from "./rules";
import { applySkill, canUseSkill, skillTargets } from "./skills";
import { SKILLS } from "./tables";
import type { Point, Unit } from "./types";

type Handler<K extends Action["type"]> = (state: BattleState, action: Extract<Action, { type: K }>) => BattleEvent[] | null;

// 지금 차례인 편의, 아직 행동하지 않은 장수만 움직인다
function actor(state: BattleState, id: string): Unit | null {
  const unit = unitById(state, id);
  return unit && unit.side === state.phase && !unit.acted ? unit : null;
}

function finishAct(state: BattleState, unit: Unit): BattleEvent[] {
  unit.acted = true;
  unit.moved = true;
  return afterAct(state, unit);
}

const HANDLERS: { [K in Action["type"]]: Handler<K> } = {
  move: (state, a) => {
    const unit = actor(state, a.unitId);
    if (!unit || unit.moved) return null;
    const path = pathTo(state, unit.id, a.to);
    if (!path) return null;
    unit.moveUsed = reachMap(state, unit).get(tileIndex(state.map, a.to))?.cost ?? 0;
    unit.x = a.to.x;
    unit.y = a.to.y;
    unit.moved = true;
    return [{ kind: "moved", unitId: unit.id, path }, ...afterMove(state, unit)];
  },
  attack: (state, a) => {
    const unit = actor(state, a.unitId);
    const target = unitById(state, a.targetId);
    if (!unit || !target || allied(unit.side, target.side)) return null;
    if (!canHit(state, unit, posOf(unit), target, posOf(target))) return null;
    const events = resolveCombat(state, unit, target, null);
    return [...events, ...finishAct(state, unit)];
  },
  skill: (state, a) => {
    const unit = unitById(state, a.unitId);
    if (!unit || unit.side !== state.phase || !canUseSkill(state, unit, a.skill)) return null;
    const info = SKILLS[a.skill];
    const aimed = info.aim === "ally" || info.aim === "enemy";
    if (aimed && (!a.targetId || !skillTargets(state, unit.id, a.skill).includes(a.targetId))) return null;
    const events = applySkill(state, unit, a.skill, a.targetId);
    return info.use === "action" ? [...events, ...finishAct(state, unit)] : events;
  },
  interact: (state, a) => {
    const unit = actor(state, a.unitId);
    const spot = state.interactables.find((i) => i.id === a.interactableId);
    if (!unit || !spot || spot.side !== unit.side || state.flags.includes(spot.flag)) return null;
    const near = spot.tiles.some((t) => manhattan(t, posOf(unit)) <= 1);
    if (!near) return null;
    state.flags = [...state.flags, spot.flag];
    return finishAct(state, unit);
  },
  wait: (state, a) => {
    const unit = actor(state, a.unitId);
    return unit ? finishAct(state, unit) : null;
  },
  endPhase: (state) => endPhase(state),
};

export function applyAction(state: BattleState, action: Action): ActionResult {
  if (state.outcome) return { state, events: [] };
  const next = structuredClone(state);
  const handler = HANDLERS[action.type] as Handler<Action["type"]>;
  const events = handler(next, action);
  if (!events) return { state, events: [] };
  const tail = next.outcome && action.type === "endPhase" ? [] : [...fireEvents(next), ...settle(next)];
  return { state: next, events: [...events, ...tail] };
}

// 첫 판을 연다: 시작 사건·1차례 사건을 띄운 상태
export function beginBattle(state: BattleState): ActionResult {
  const next = structuredClone(state);
  const events = openingEvents(next);
  return { state: next, events: [...events, ...settle(next)] };
}

// 이 편에 아직 움직일 장수가 남았나
export function sideDone(state: BattleState, side = state.phase): boolean {
  return state.units.every((u) => u.side !== side || u.acted);
}

// 장수가 서 있거나 곁에 선 켤 자리
export function interactablesFor(state: BattleState, unitId: string): string[] {
  const unit = unitById(state, unitId);
  if (!unit || unit.acted) return [];
  return state.interactables
    .filter((i) => i.side === unit.side && !state.flags.includes(i.flag) && i.tiles.some((t: Point) => manhattan(t, posOf(unit)) <= 1 || onTiles(posOf(unit), [t])))
    .map((i) => i.id);
}
