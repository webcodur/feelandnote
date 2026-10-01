/*
  파일명: components/features/game/myth/troy/engine/rules.ts
  기능: 트로이 전쟁 장 규칙과 이기고 지는 판정
  책임: 장마다 다른 규칙(배 불타기·물 번짐·금지 구역·적진의 벗)을 행동 뒤·적 차례 끝에 적용하고,
        목표·패배 조건으로 판이 끝났는지 가린다.
*/ // ------------------------------
import type { BattleEvent, BattleState, ChapterRule } from "./battleTypes";
import { inBounds, isOut, manhattan, neighbors, onTiles, posOf, sideUnits, tileAt, tileIndex, unitAt } from "./grid";
import { pairKey } from "./modifiers";
import { stepCost } from "./path";
import { shuffle } from "./rng";
import { BONUS } from "./tables";
import type { Point, Unit } from "./types";

type RuleOf<K extends ChapterRule["kind"]> = Extract<ChapterRule, { kind: K }>;

function rulesOf<K extends ChapterRule["kind"]>(state: BattleState, kind: K): RuleOf<K>[] {
  return state.rules.filter((r): r is RuleOf<K> => r.kind === kind);
}

function addFlag(state: BattleState, flag: string) {
  if (!state.flags.includes(flag)) state.flags = [...state.flags, flag];
}

// #region 행동 뒤
// 금지 구역에 들어섰나(이동 뒤)
export function afterMove(state: BattleState, unit: Unit): BattleEvent[] {
  for (const rule of rulesOf(state, "zone")) {
    if (rule.unitId === unit.id && onTiles(posOf(unit), rule.tiles)) addFlag(state, rule.flag);
  }
  return truceMeetings(state);
}

// 적진의 벗이 처음 곁에 섰나
function truceMeetings(state: BattleState): BattleEvent[] {
  const out: BattleEvent[] = [];
  for (const rule of rulesOf(state, "truce")) {
    for (const [a, b] of rule.pairs) {
      const ua = state.units.find((u) => (u.figureSlug ?? u.id) === a);
      const ub = state.units.find((u) => (u.figureSlug ?? u.id) === b);
      const key = `truce:${pairKey(a, b)}`;
      if (!ua || !ub || state.clashed.includes(key) || manhattan(posOf(ua), posOf(ub)) !== 1) continue;
      state.clashed = [...state.clashed, key];
      out.push({ kind: "truce", a: ua.id, b: ub.id });
    }
  }
  return out;
}

// 적이 배 곁에서 행동을 마치면 그 배가 탄다
export function afterAct(state: BattleState, unit: Unit): BattleEvent[] {
  const out: BattleEvent[] = [];
  if (unit.side !== "enemy" || !state.units.some((u) => u.id === unit.id)) return out;
  for (const rule of rulesOf(state, "burnShips")) {
    for (const ship of rule.ships) {
      if (state.burned.includes(ship.id)) continue;
      if (!ship.tiles.some((t) => manhattan(t, posOf(unit)) <= 1)) continue;
      state.burned = [...state.burned, ship.id];
      addFlag(state, `ship-burned:${ship.id}`);
      out.push({ kind: "shipBurned", shipId: ship.id });
      if (state.burned.length >= rule.lossAt) state.outcome = state.outcome ?? "defeat";
    }
  }
  return out;
}
// #endregion

// #region 적 차례 끝 — 물 번짐
function nearestDry(state: BattleState, unit: Unit, from: Point): Point | null {
  const seen = new Set<number>([tileIndex(state.map, from)]);
  const queue: Point[] = [from];
  while (queue.length > 0) {
    const p = queue.shift() as Point;
    const tile = tileAt(state.map, p);
    const dry = tile && tile.terrain !== "water" && !unitAt(state, p);
    if (dry && neighbors(state.map, p).some((q) => stepCost(state, unit, q, p) !== null)) return p;
    for (const q of neighbors(state.map, p)) {
      const id = tileIndex(state.map, q);
      if (inBounds(state.map, q) && !seen.has(id)) {
        seen.add(id);
        queue.push(q);
      }
    }
  }
  return null;
}

export function flood(state: BattleState): BattleEvent[] {
  const rule = rulesOf(state, "flood")[0];
  if (!rule || state.flags.includes(rule.stopFlag)) return [];
  const map = state.map;
  const RISE: Partial<Record<string, "shallow" | "water">> = { plain: "shallow", sand: "shallow", road: "shallow", shallow: "water" };
  const candidates: Point[] = [];
  map.tiles.forEach((tile, i) => {
    const p = { x: i % map.width, y: Math.floor(i / map.width) };
    if (RISE[tile.terrain] && neighbors(map, p).some((q) => tileAt(map, q)?.terrain === "water")) candidates.push(p);
  });
  const chosen = shuffle(state, candidates).slice(0, BONUS.floodTiles);
  for (const p of chosen) {
    const tile = map.tiles[tileIndex(map, p)];
    map.tiles[tileIndex(map, p)] = { ...tile, terrain: RISE[tile.terrain] ?? tile.terrain };
  }
  const swept: string[] = [];
  for (const p of chosen) {
    const unit = unitAt(state, p);
    if (!unit || map.tiles[tileIndex(map, p)].terrain !== "water" || unit.classKey === "river" || unit.classKey === "god") continue;
    const dry = nearestDry(state, unit, p);
    if (dry) {
      unit.x = dry.x;
      unit.y = dry.y;
    }
    unit.hp = Math.max(1, unit.hp - BONUS.floodDamage);
    swept.push(unit.id);
  }
  return chosen.length > 0 ? [{ kind: "flooded", tiles: chosen, swept }] : [];
}
// #endregion

// #region 판정
// 적 차례가 끝날 때만 보는 조건(버티기·차례 제한)
export function endOfRound(state: BattleState) {
  if (state.outcome) return;
  const limit = state.loss.find((r) => r.kind === "turnLimit");
  const survive = state.objective.kind === "survive" && state.turn >= state.objective.turns;
  if (survive) state.outcome = "victory";
  else if (limit && limit.kind === "turnLimit" && state.turn >= limit.turns) state.outcome = "defeat";
}

function lost(state: BattleState): boolean {
  if (sideUnits(state, "player").length === 0) return true;
  return state.loss.some((rule) => {
    if (rule.kind === "unitFalls") return rule.unitIds.some((id) => state.fallen.includes(id));
    if (rule.kind === "enemyReaches") return state.units.some((u) => u.side === "enemy" && (!rule.unitIds || rule.unitIds.includes(u.id)) && onTiles(posOf(u), rule.tiles));
    if (rule.kind === "flag") return state.flags.includes(rule.flag);
    return false;
  });
}

function won(state: BattleState): boolean {
  const o = state.objective;
  if (o.kind === "rout") return sideUnits(state, "enemy").length === 0;
  if (o.kind === "defeat") return o.unitIds.every((id) => isOut(state, id));
  if (o.kind === "reach") return state.units.some((u) => o.unitIds.includes(u.id) && onTiles(posOf(u), o.tiles));
  return false;
}

// 판이 끝났으면 상태에 적고 결과를 돌려준다
export function settle(state: BattleState): BattleEvent[] {
  if (!state.outcome) state.outcome = lost(state) ? "defeat" : won(state) ? "victory" : null;
  return state.outcome ? [{ kind: "outcome", outcome: state.outcome }] : [];
}

export function checkOutcome(state: BattleState): "victory" | "defeat" | null {
  return state.outcome ?? (lost(state) ? "defeat" : won(state) ? "victory" : null);
}
// #endregion
