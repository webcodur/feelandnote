/*
  파일명: components/features/game/myth/troy/engine/ai.ts
  기능: 트로이 전쟁 적·아군 AI
  책임: 한 편의 장수를 하나씩 골라 다음 행동(이동 → 공격·치료·기다림)을 정하고, 한 편의 차례를 끝까지 돌린다.
        같은 상태에서는 늘 같은 행동을 고른다(난수를 쓰지 않는다).
*/ // ------------------------------
import type { Action, ActionResult, BattleEvent, BattleState } from "./battleTypes";
import { attackScore, standable, targetsFrom } from "./aiScore";
import { allied, manhattan, posOf, samePoint, tileAt, tileIndex, unitById } from "./grid";
import { distanceField } from "./path";
import { canUseSkill, skillTargets } from "./skills";
import { TERRAIN, WEAPONS } from "./tables";
import { applyAction } from "./turn";
import type { AiPlan, Point, Side, Unit } from "./types";

function foesOf(state: BattleState, unit: Unit): Unit[] {
  return state.units.filter((u) => !allied(u.side, unit.side));
}

// 활·투창을 먼저, 그다음 적에게 가까운 장수부터
function order(state: BattleState, side: Side): Unit[] {
  const nearest = (u: Unit) => Math.min(99, ...foesOf(state, u).map((f) => manhattan(posOf(f), posOf(u))));
  // 이미 움직인 장수가 먼저 행동을 마친다(한 장수씩 끝까지 연출되게)
  return state.units
    .filter((u) => u.side === side && !u.acted)
    .sort((a, b) =>
      Number(b.moved) - Number(a.moved) ||
      Number(WEAPONS[b.weapon].max >= 2) - Number(WEAPONS[a.weapon].max >= 2) ||
      nearest(a) - nearest(b) ||
      a.id.localeCompare(b.id));
}

function groundScore(state: BattleState, p: Point): number {
  const tile = tileAt(state.map, p);
  return tile ? TERRAIN[tile.terrain].def * 2 + TERRAIN[tile.terrain].avoid / 10 : 0;
}

// 가장 좋은 공격(칸·상대). 없으면 null
function bestAttack(state: BattleState, unit: Unit, tiles: Point[]): { at: Point; targetId: string; score: number } | null {
  let best: { at: Point; targetId: string; score: number } | null = null;
  for (const at of tiles) {
    for (const id of targetsFrom(state, unit.id, at)) {
      const foe = unitById(state, id);
      if (!foe) continue;
      const score = attackScore(state, unit, at, foe);
      if (score > -10 && (!best || score > best.score)) best = { at, targetId: id, score };
    }
  }
  return best;
}

// 목표 칸들 쪽으로 가장 가까워지는 멈출 칸(flee면 가장 멀어지는 칸)
function stepToward(state: BattleState, unit: Unit, goals: Point[], away: boolean): Point | null {
  if (goals.length === 0) return null;
  const field = distanceField(state, unit, goals);
  const value = (p: Point) => {
    const d = field[tileIndex(state.map, p)];
    const near = Math.min(...goals.map((g) => manhattan(g, p)));
    return away ? -near : Number.isFinite(d) ? d : 999 + near;
  };
  const tiles = standable(state, unit);
  tiles.sort((a, b) => value(a) - value(b) || groundScore(state, b) - groundScore(state, a) || a.y - b.y || a.x - b.x);
  const pick = tiles[0];
  return pick && !samePoint(pick, posOf(unit)) && value(pick) < value(posOf(unit)) ? pick : null;
}

function healPlan(state: BattleState, unit: Unit): Action | null {
  if (!canUseSkill(state, unit, "heal")) return null;
  const hurt = skillTargets(state, unit.id, "heal")
    .map((id) => unitById(state, id))
    .filter((u): u is Unit => Boolean(u && u.hp / u.stats.hp < 0.7))
    .sort((a, b) => a.hp / a.stats.hp - b.hp / b.stats.hp);
  return hurt[0] ? { type: "skill", unitId: unit.id, skill: "heal", targetId: hurt[0].id } : null;
}

function goalsFor(state: BattleState, unit: Unit, plan: AiPlan): Point[] {
  const wanted = plan.targetIds ? foesOf(state, unit).filter((f) => plan.targetIds?.some((id) => id === f.id || id === f.figureSlug)) : [];
  const chase = (wanted.length > 0 ? wanted : foesOf(state, unit)).map(posOf);
  return plan.mode === "seek" || plan.mode === "flee" ? plan.goal ?? chase : chase;
}

function decide(state: BattleState, unit: Unit): Action {
  const plan: AiPlan = unit.ai ?? { mode: "charge" };
  const wait: Action = { type: "wait", unitId: unit.id };
  const here = posOf(unit);
  if (plan.mode === "idle") return wait;
  const heal = healPlan(state, unit);
  if (heal) return heal;
  const still = unit.moved || plan.mode === "hold" || plan.mode === "guard";
  const attack = bestAttack(state, unit, still ? [here] : plan.mode === "flee" ? [] : standable(state, unit));
  if (attack) {
    if (!samePoint(attack.at, here)) return { type: "move", unitId: unit.id, to: attack.at };
    const aimed = canUseSkill(state, unit, "aimedShot") && skillTargets(state, unit.id, "aimedShot").includes(attack.targetId);
    return aimed ? { type: "skill", unitId: unit.id, skill: "aimedShot", targetId: attack.targetId } : { type: "attack", unitId: unit.id, targetId: attack.targetId };
  }
  if (still) return wait;
  const step = stepToward(state, unit, goalsFor(state, unit, plan), plan.mode === "flee");
  return step ? { type: "move", unitId: unit.id, to: step } : wait;
}

// 이 편이 할 다음 행동. 더 없으면 null(부르는 쪽이 endPhase를 보낸다)
export function nextAiAction(state: BattleState, side: Side): Action | null {
  if (state.outcome || state.phase !== side) return null;
  const unit = order(state, side)[0];
  return unit ? decide(state, unit) : null;
}

// 한 편의 차례를 끝까지 돌리고 차례를 넘긴다
export function runPhase(state: BattleState, side: Side): ActionResult {
  let current = state;
  const events: BattleEvent[] = [];
  for (let i = 0; i < 400 && !current.outcome && current.phase === side; i += 1) {
    const action = nextAiAction(current, side);
    const result = applyAction(current, action ?? { type: "endPhase" });
    const stuck = result.state === current && action && action.type !== "endPhase";
    const next = stuck ? applyAction(current, { type: "wait", unitId: action.unitId }) : result;
    if (next.state === current) break;
    events.push(...next.events);
    current = next.state;
    if (!action) break;
  }
  return { state: current, events };
}

// 이 편이 다음 차례에 할 행동 목록(예언 — 화면이 미리 보여 준다)
export function planPhase(state: BattleState, side: Side): Action[] {
  const probe: BattleState = { ...structuredClone(state), phase: side };
  // 그 편의 차례가 막 열린 것처럼 행동 기록만 비운다(상태·사건은 건드리지 않는다)
  for (const unit of probe.units.filter((u) => u.side === side)) {
    unit.moved = false;
    unit.acted = false;
    unit.moveUsed = 0;
  }
  const actions: Action[] = [];
  let current = probe;
  for (let i = 0; i < 400; i += 1) {
    const action = nextAiAction(current, side);
    if (!action) break;
    const result = applyAction(current, action);
    const next = result.state === current && "unitId" in action ? applyAction(current, { type: "wait", unitId: action.unitId }) : result;
    if (next.state === current) break;
    actions.push(action);
    current = next.state;
  }
  return actions;
}
