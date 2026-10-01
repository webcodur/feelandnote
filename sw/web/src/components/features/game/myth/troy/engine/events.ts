/*
  파일명: components/features/game/myth/troy/engine/events.ts
  기능: 트로이 전쟁 판 사건
  책임: 장 자료의 사건 조건을 살피고, 맞으면 한 번만 행동(장면·원군·물러남·상태·지형·표지·목표·AI·체력)을 적용한다.
        한 사건이 켠 표지·빠진 장수가 다른 사건을 부를 수 있어 새로 맞는 사건이 없을 때까지 돈다.
*/ // ------------------------------
import type { BattleEvent, BattleState, EventAction, EventDef, Trigger } from "./battleTypes";
import { removeUnit } from "./combat";
import { inBounds, manhattan, neighbors, onTiles, posOf, tileAt, tileIndex, unitAt, unitById } from "./grid";
import { stepCost } from "./path";
import { unitFromSpawn } from "./spawn";
import type { Point, Side, Unit, UnitSpawn } from "./types";

export interface EventMoment {
  start?: boolean;
  phase?: { turn: number; side: Side };
}

// #region 조건
function flagMatch(flags: string[], want: string): boolean {
  return want.endsWith("*") ? flags.some((f) => f.startsWith(want.slice(0, -1))) : flags.includes(want);
}

const CHECKS: { [K in Trigger["on"]]: (state: BattleState, t: Extract<Trigger, { on: K }>, m: EventMoment) => boolean } = {
  start: (_s, _t, m) => Boolean(m.start),
  turn: (_s, t, m) => Boolean(m.phase && m.phase.turn === t.turn && m.phase.side === (t.phase ?? "player")),
  defeated: (s, t) => s.fallen.includes(t.unitId),
  retreated: (s, t) => s.retreated.includes(t.unitId),
  hpBelow: (s, t) => {
    const u = unitById(s, t.unitId);
    return Boolean(u && u.hp / u.stats.hp < t.ratio);
  },
  reach: (s, t) => s.units.some((u) => t.unitIds.includes(u.id) && onTiles(posOf(u), t.tiles)),
  adjacent: (s, t) => {
    const a = unitById(s, t.a);
    const b = unitById(s, t.b);
    return Boolean(a && b && manhattan(posOf(a), posOf(b)) === 1);
  },
  flag: (s, t) => flagMatch(s.flags, t.flag),
};

function matches(state: BattleState, def: EventDef, moment: EventMoment): boolean {
  if (state.fired.includes(def.id)) return false;
  if (def.ifFlag && !flagMatch(state.flags, def.ifFlag)) return false;
  if (def.ifNotFlag && flagMatch(state.flags, def.ifNotFlag)) return false;
  const check = CHECKS[def.when.on] as (s: BattleState, t: Trigger, m: EventMoment) => boolean;
  return check(state, def.when, moment);
}
// #endregion

// #region 행동
function pickUnits(state: BattleState, ids: string[]): Unit[] {
  const sides = ids.filter((id) => id.startsWith("@")).map((id) => id.slice(1));
  return state.units.filter((u) => ids.includes(u.id) || sides.includes(u.side));
}

// 원군이 설 칸 — 적힌 칸이 막혔으면 가까운 빈 칸
function freeSpot(state: BattleState, unit: Unit, want: Point): Point | null {
  const seen = new Set<number>([tileIndex(state.map, want)]);
  const queue: Point[] = [want];
  while (queue.length > 0) {
    const p = queue.shift() as Point;
    const tile = tileAt(state.map, p);
    const open = tile && !unitAt(state, p) && neighbors(state.map, p).some((q) => stepCost(state, unit, q, p) !== null);
    if (open) return p;
    for (const q of neighbors(state.map, p)) {
      const id = tileIndex(state.map, q);
      if (!seen.has(id) && inBounds(state.map, q)) {
        seen.add(id);
        queue.push(q);
      }
    }
  }
  return null;
}

function spawnUnits(state: BattleState, spawns: UnitSpawn[]): BattleEvent[] {
  const ids: string[] = [];
  for (const spawn of spawns) {
    if (unitById(state, spawn.id)) continue;
    const unit = unitFromSpawn(spawn);
    const at = freeSpot(state, unit, spawn);
    if (!at) continue;
    state.units = [...state.units, { ...unit, x: at.x, y: at.y }];
    ids.push(unit.id);
  }
  return ids.length > 0 ? [{ kind: "spawned", unitIds: ids }] : [];
}

type Apply = (state: BattleState, action: EventAction) => BattleEvent[];

const ACTIONS: { [K in EventAction["do"]]: (state: BattleState, a: Extract<EventAction, { do: K }>) => BattleEvent[] } = {
  scene: (_s, a) => [{ kind: "scene", sceneId: a.sceneId }],
  spawn: (s, a) => spawnUnits(s, a.units),
  retreat: (s, a) => {
    const u = unitById(s, a.unitId);
    return u ? [removeUnit(s, u, "retreated")] : [];
  },
  status: (s, a) =>
    pickUnits(s, a.unitIds).map((u) => {
      u.statuses = [...u.statuses.filter((x) => x.key !== a.status.key), a.status];
      return { kind: "status", unitId: u.id, status: a.status } as BattleEvent;
    }),
  clearStatus: (s, a) => {
    for (const u of pickUnits(s, a.unitIds)) u.statuses = u.statuses.filter((x) => x.key !== a.key);
    return [];
  },
  terrain: (s, a) => {
    for (const p of a.tiles) {
      const tile = tileAt(s.map, p);
      if (!tile) continue;
      s.map.tiles[tileIndex(s.map, p)] = { terrain: a.terrain, height: a.height ?? tile.height };
    }
    return [{ kind: "terrain", tiles: a.tiles }];
  },
  flag: (s, a) => {
    if (!s.flags.includes(a.flag)) s.flags = [...s.flags, a.flag];
    return [];
  },
  objective: (s, a) => {
    s.objective = a.objective;
    return [];
  },
  ai: (s, a) => {
    for (const u of pickUnits(s, a.unitIds)) u.ai = a.ai;
    return [];
  },
  kill: (s, a) => {
    const u = unitById(s, a.unitId);
    return u ? [removeUnit(s, u, "fell")] : [];
  },
  heal: (s, a) =>
    pickUnits(s, a.unitIds).map((u) => {
      const amount = Math.min(u.stats.hp - u.hp, a.amount);
      u.hp += amount;
      return { kind: "healed", unitId: u.id, amount, hp: u.hp } as BattleEvent;
    }),
  hp: (s, a) => {
    for (const u of pickUnits(s, a.unitIds)) u.hp = Math.max(1, Math.round(u.stats.hp * a.ratio));
    return [];
  },
  focus: (_s, a) => [{ kind: "focus", tile: a.tile }],
  victory: (s) => {
    s.outcome = s.outcome ?? "victory";
    return [];
  },
  defeat: (s) => {
    s.outcome = s.outcome ?? "defeat";
    return [];
  },
};
// #endregion

// 복제한 상태에서 맞는 사건을 모두 발화한다
export function fireEvents(state: BattleState, moment: EventMoment = {}): BattleEvent[] {
  const out: BattleEvent[] = [];
  for (let round = 0; round < 12; round += 1) {
    const ready = state.events.filter((def) => matches(state, def, moment));
    if (ready.length === 0) break;
    for (const def of ready) {
      state.fired = [...state.fired, def.id];
      for (const action of def.actions) out.push(...(ACTIONS[action.do] as Apply)(state, action));
    }
  }
  return out;
}
