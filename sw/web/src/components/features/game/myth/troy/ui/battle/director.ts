/*
  파일명: components/features/game/myth/troy/ui/battle/director.ts
  기능: 트로이 전쟁 싸움 결과 연출
  책임: 규칙이 돌려준 결과(BattleEvent)를 차례대로 3D 연출과 화면 알림(대화 장면·맞수·차례 알림·수준 오름)으로 바꿔 튼다.
        연출이 다 끝나면 판을 새 상태로 맞춘다. 규칙의 상태는 건드리지 않는다.
*/ // ------------------------------
import type { BattleEvent, BattleState, StatusKey, Unit } from "../../engine";
import type { BoardView } from "../../scene/BoardView";
import type { SceneUnit } from "../../scene/BoardView";
import { follow } from "./camera";

export interface DirectorHooks {
  view: BoardView;
  // 판 상태를 3D 말로(숨길 말 id)
  units: (state: BattleState, hidden?: string[]) => SceneUnit[];
  scene: (sceneId: string) => Promise<void>;
  rival: (a: Unit | null, b: Unit | null, note: string | null, state: BattleState) => Promise<void>;
  // 싸움을 건 인물의 외침(기다리지 않는다). state는 싸움 뒤 판(곁의 우리 편·쓰러진 동료를 본다)
  bark: (speaker: Unit | null, target: Unit | null, state: BattleState) => void;
  notice: (text: string) => Promise<void>;
  toast: (text: string) => void;
  label: {
    phase: (phase: BattleState["phase"], turn: number) => string;
    status: (key: StatusKey) => string;
    skill: (key: string) => string;
    levelUp: (unit: Unit, level: number) => string;
    truce: string;
    shipBurned: string;
  };
}

const GOOD: StatusKey[] = ["blessed", "divineStrike", "guarding", "wrath", "borrowedArmor"];

function find(before: BattleState, after: BattleState, id: string): Unit | null {
  return after.units.find((u) => u.id === id) ?? after.removed.find((u) => u.id === id) ?? before.units.find((u) => u.id === id) ?? null;
}

function shipTiles(state: BattleState, shipId: string) {
  for (const rule of state.rules) {
    if (rule.kind === "burnShips") {
      const ship = rule.ships.find((s) => s.id === shipId);
      if (ship) return ship.tiles;
    }
  }
  return [];
}

type Step = (e: BattleEvent, before: BattleState, after: BattleState, h: DirectorHooks) => Promise<void>;

const STEPS: Partial<Record<BattleEvent["kind"], Step>> = {
  moved: async (e, _b, _a, h) => {
    if (e.kind !== "moved") return;
    const end = e.path[e.path.length - 1];
    if (end) await follow(h.view, end);
    await h.view.play({ kind: "move", unitId: e.unitId, path: e.path });
  },
  combat: async (e, b, a, h) => {
    if (e.kind !== "combat") return;
    const defender = find(b, a, e.defenderId);
    if (defender) await follow(h.view, { x: defender.x, y: defender.y });
    h.bark(find(b, a, e.attackerId), defender, a);
    for (const s of e.strikes) {
      await h.view.play({ kind: e.ranged ? "ranged" : "melee", attackerId: s.attackerId, targetId: s.targetId, hit: s.hit, crit: s.crit, damage: s.damage, targetHp: s.targetHp });
    }
  },
  healed: async (e, _b, _a, h) => { if (e.kind === "healed" && e.amount > 0) await h.view.play({ kind: "heal", unitId: e.unitId, amount: e.amount, hp: e.hp }); },
  status: async (e, b, a, h) => {
    if (e.kind !== "status" || e.status.turns === 0 && e.status.key === "blessed") return;
    const unit = find(b, a, e.unitId);
    await h.view.play({ kind: "status", unitId: e.unitId, tone: GOOD.includes(e.status.key) ? "good" : "bad" });
    if (unit) void h.view.play({ kind: "text", tile: { x: unit.x, y: unit.y }, text: h.label.status(e.status.key), tone: "info" });
  },
  skill: async (e, b, a, h) => {
    if (e.kind !== "skill") return;
    const unit = find(b, a, e.unitId);
    if (unit) await h.view.play({ kind: "text", tile: { x: unit.x, y: unit.y }, text: h.label.skill(e.skill), tone: "info" });
  },
  fell: async (e, _b, _a, h) => { if (e.kind === "fell") await h.view.play({ kind: "fall", unitId: e.unitId }); },
  retreated: async (e, _b, _a, h) => { if (e.kind === "retreated") await h.view.play({ kind: "retreat", unitId: e.unitId }); },
  spawned: async (e, b, a, h) => {
    if (e.kind !== "spawned") return;
    h.view.setUnits(h.units(a, e.unitIds));
    for (const id of e.unitIds) {
      const unit = find(b, a, id);
      if (unit?.tags.includes("divine")) await h.view.play({ kind: "divine", tile: { x: unit.x, y: unit.y } });
    }
    await h.view.play({ kind: "spawn", unitIds: e.unitIds });
  },
  terrain: async (e, _b, a, h) => {
    if (e.kind !== "terrain") return;
    await h.view.setMap(a.map, a.flags);
    await h.view.play({ kind: "terrain", tiles: e.tiles });
  },
  flooded: async (e, _b, a, h) => {
    if (e.kind !== "flooded") return;
    await h.view.setMap(a.map, a.flags);
    await h.view.play({ kind: "terrain", tiles: e.tiles });
  },
  shipBurned: async (e, _b, a, h) => {
    if (e.kind !== "shipBurned") return;
    await h.view.play({ kind: "burn", tiles: shipTiles(a, e.shipId) });
    h.toast(h.label.shipBurned);
  },
  levelUp: async (e, b, a, h) => {
    if (e.kind !== "levelUp") return;
    const unit = find(b, a, e.levelUp.unitId);
    await h.view.play({ kind: "levelUp", unitId: e.levelUp.unitId });
    if (unit) h.toast(h.label.levelUp(unit, e.levelUp.level));
  },
  rivalClash: async (e, b, a, h) => { if (e.kind === "rivalClash") await h.rival(find(b, a, e.a), find(b, a, e.b), e.note, a); },
  truce: async (e, _b, _a, h) => { if (e.kind === "truce") await h.notice(h.label.truce); },
  scene: async (e, _b, _a, h) => { if (e.kind === "scene") await h.scene(e.sceneId); },
  focus: async (e, _b, _a, h) => { if (e.kind === "focus") h.view.focusOn(e.tile, true); },
  phase: async (e, _b, _a, h) => { if (e.kind === "phase") await h.notice(h.label.phase(e.phase, e.turn)); },
};

// 한 행동의 결과를 차례로 틀고, 끝나면 판을 새 상태로 맞춘다
export async function playEvents(events: BattleEvent[], before: BattleState, after: BattleState, hooks: DirectorHooks): Promise<void> {
  const gateOpened = !before.flags.includes("gate-open") && after.flags.includes("gate-open");
  for (const event of events) await STEPS[event.kind]?.(event, before, after, hooks);
  if (gateOpened) await hooks.view.setMap(after.map, after.flags);
  hooks.view.setUnits(hooks.units(after));
}
