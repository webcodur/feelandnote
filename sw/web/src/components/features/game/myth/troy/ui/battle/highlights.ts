/*
  파일명: components/features/game/myth/troy/ui/battle/highlights.ts
  기능: 트로이 전쟁 싸움판 강조 칸 계산
  책임: 판 상태와 누름 단계로 3D 판에 켤 강조 층(갈 칸·칠 칸·치료 칸·위험 칸·대상·도달 목표)과 길 미리 보기를 만든다.
        PC에서 고른 장수로 갈 칸을 가리키면 그 칸까지 걸어갈 길을 미리 그린다.
*/ // ------------------------------
import { dangerTiles, pathTo, rangeFrom, reachable, skillTargets, threatTiles, unitById } from "../../engine";
import type { BattleState, Point } from "../../engine";
import type { HighlightLayer } from "../../scene/BoardView";
import type { BattleUi } from "./battleInput";

export type Layers = Partial<Record<HighlightLayer, Point[]>>;

const key = (p: Point) => `${p.x},${p.y}`;

function minus(a: Point[], b: Point[]): Point[] {
  const cut = new Set(b.map(key));
  return a.filter((p) => !cut.has(key(p)));
}

// 아무도 설 수 없는 칸(바다·성벽·배·집)은 칠 칸으로 칠하지 않는다 — 그 위에 적이 서 있을 때만 남긴다
const NOWHERE = new Set(["water", "wall", "ship", "building", "palisade"]);
function standableGround(state: BattleState, tiles: Point[]): Point[] {
  return tiles.filter((p) => {
    const tile = state.map.tiles[p.y * state.map.width + p.x];
    return tile && (!NOWHERE.has(tile.terrain) || state.units.some((u) => u.x === p.x && u.y === p.y));
  });
}

// 목표가 칸에 닿기면 그 칸을 보라색으로 늘 보여 준다
function goalTiles(state: BattleState): Point[] {
  return state.objective.kind === "reach" ? state.objective.tiles : [];
}

export function layersFor(state: BattleState, ui: BattleUi, showDanger: boolean): Layers {
  const layers: Layers = { zone: goalTiles(state) };
  if (showDanger) layers.danger = dangerTiles(state, "enemy");
  const me = ui.selectedId ? unitById(state, ui.selectedId) : null;
  const inspect = ui.inspectId ? unitById(state, ui.inspectId) : null;
  if (inspect && inspect.side !== "player") layers.danger = standableGround(state, threatTiles(state, inspect.id));
  if (showDanger && layers.danger) layers.danger = standableGround(state, layers.danger);
  if (!me) return layers;
  const here = { x: me.x, y: me.y };
  if (ui.mode === "selected") {
    const move = reachable(state, me.id);
    layers.move = move;
    layers.attack = standableGround(state, minus(threatTiles(state, me.id), move));
  }
  if (ui.mode === "moved") layers.attack = standableGround(state, rangeFrom(state, me, here));
  if (ui.mode === "skill" && ui.skill) {
    const ids = skillTargets(state, me.id, ui.skill);
    layers.heal = ids.map((id) => unitById(state, id)).flatMap((u) => (u ? [{ x: u.x, y: u.y }] : []));
  }
  if (ui.mode === "target" && ui.targetId) {
    const t = unitById(state, ui.targetId);
    if (t) layers.target = [{ x: t.x, y: t.y }];
    if (ui.attackFrom) layers.move = [ui.attackFrom];
  }
  return layers;
}

// 움직여서 칠 때의 길, 또는 고른 장수로 갈 칸을 가리킬 때(마우스)의 길. 그 밖에는 길을 그리지 않는다
export function pathFor(state: BattleState, ui: BattleUi, hover: Point | null = null): Point[] | null {
  if (!ui.selectedId) return null;
  if (ui.mode === "target" && ui.attackFrom) return pathTo(state, ui.selectedId, ui.attackFrom);
  if (ui.mode !== "selected" || !hover || state.units.some((u) => u.x === hover.x && u.y === hover.y)) return null;
  return reachable(state, ui.selectedId).some((p) => p.x === hover.x && p.y === hover.y) ? pathTo(state, ui.selectedId, hover) : null;
}
