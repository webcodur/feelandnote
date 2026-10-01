/*
  파일명: components/features/game/myth/troy/ui/battle/battleInput.ts
  기능: 트로이 전쟁 싸움판 누름 판단
  책임: 지금 판 상태와 고른 장수·단계를 보고, 칸 하나를 누르면 무엇을 할지(고르기·움직이기·예측·공격·기술 대상) 정한다.
        화면 상태를 바꾸지 않는 순수 함수다. 실제 적용과 연출은 useBattle이 한다.
*/ // ------------------------------
import { allied, pathTo, skillTargets, standable, targetsFrom, TERRAIN, unitAt, unitById } from "../../engine";
import type { BattleState, Point, SkillKey } from "../../engine";

export type Mode = "idle" | "selected" | "moved" | "target" | "skill" | "busy";

export interface BattleUi {
  mode: Mode;
  selectedId: string | null;
  // 우리 편이 아닌 장수를 눌러 살펴보는 중
  inspectId: string | null;
  targetId: string | null;
  // 움직여서 칠 때 설 칸(없으면 지금 자리)
  attackFrom: Point | null;
  skill: SkillKey | null;
  // 움직이기 전 판(취소하면 되돌린다)
  undo: BattleState | null;
}

export const IDLE: BattleUi = { mode: "idle", selectedId: null, inspectId: null, targetId: null, attackFrom: null, skill: null, undo: null };

export type Command =
  | { kind: "move"; unitId: string; to: Point }
  | { kind: "attack"; unitId: string; targetId: string; from: Point | null }
  | { kind: "skill"; unitId: string; skill: SkillKey; targetId: string };

export interface TapResult {
  ui: BattleUi;
  command?: Command;
}

const same = (a: Point | null, b: Point) => Boolean(a && a.x === b.x && a.y === b.y);

// 움직여서 칠 때 설 칸 — 지금 자리가 되면 지금 자리, 아니면 막기 좋은 칸, 같으면 가까운 칸
export function attackTile(state: BattleState, unitId: string, targetId: string): Point | null {
  const unit = unitById(state, unitId);
  if (!unit) return null;
  const here = { x: unit.x, y: unit.y };
  if (targetsFrom(state, unitId, here).includes(targetId)) return here;
  if (unit.moved) return null;
  const tiles = standable(state, unit).filter((p) => targetsFrom(state, unitId, p).includes(targetId));
  const score = (p: Point) => {
    const tile = state.map.tiles[p.y * state.map.width + p.x];
    const ground = tile ? TERRAIN[tile.terrain].def * 2 + TERRAIN[tile.terrain].avoid / 10 + tile.height : 0;
    return ground * 10 - (pathTo(state, unitId, p)?.length ?? 99);
  };
  return tiles.sort((a, b) => score(b) - score(a))[0] ?? null;
}

function selectOwn(state: BattleState, id: string): BattleUi {
  const unit = unitById(state, id);
  const canAct = unit && unit.side === "player" && !unit.acted;
  return canAct ? { ...IDLE, mode: "selected", selectedId: id } : { ...IDLE, inspectId: id };
}

// 칸 하나를 눌렀을 때
export function tap(state: BattleState, ui: BattleUi, p: Point): TapResult {
  if (ui.mode === "busy" || state.phase !== "player") return { ui };
  const there = unitAt(state, p);
  const me = ui.selectedId ? unitById(state, ui.selectedId) : null;
  // 기술 대상 고르기
  if (ui.mode === "skill" && me && ui.skill) {
    const ok = there && skillTargets(state, me.id, ui.skill).includes(there.id);
    return ok && there ? { ui: { ...ui, mode: "busy" }, command: { kind: "skill", unitId: me.id, skill: ui.skill, targetId: there.id } } : { ui: { ...ui, mode: "moved", skill: null } };
  }
  // 예측을 띄운 상대를 한 번 더 누르면 친다
  if (ui.mode === "target" && me && there && there.id === ui.targetId) {
    return { ui: { ...ui, mode: "busy" }, command: { kind: "attack", unitId: me.id, targetId: there.id, from: ui.attackFrom } };
  }
  if (!me || ui.mode === "idle") return { ui: there ? selectOwn(state, there.id) : IDLE };
  // 적을 누르면 예측
  if (there && !allied(there.side, me.side)) {
    const from = attackTile(state, me.id, there.id);
    if (!from) return { ui: { ...ui, inspectId: there.id } };
    const here = same(from, { x: me.x, y: me.y });
    return { ui: { ...ui, mode: "target", targetId: there.id, attackFrom: here ? null : from, inspectId: null } };
  }
  // 고른 장수를 다시 누르면 제자리에서 행동
  if (there && there.id === me.id) {
    return me.moved ? { ui } : { ui: { ...ui, mode: "moved", undo: state, targetId: null, attackFrom: null } };
  }
  if (there && there.side === "player") return { ui: me.moved ? ui : selectOwn(state, there.id) };
  if (there) return { ui: { ...ui, inspectId: there.id } };
  // 빈 칸: 움직이기(아직 안 움직였을 때)
  if (!me.moved && standable(state, me).some((q) => same(q, p))) {
    return { ui: { ...ui, mode: "busy", undo: state, targetId: null, attackFrom: null }, command: { kind: "move", unitId: me.id, to: p } };
  }
  return { ui: me.moved ? { ...ui, mode: "moved", targetId: null, attackFrom: null } : IDLE };
}
