/*
  파일명: components/features/game/myth/troy/engine/rules.test.ts
  기능: 트로이 전쟁 장 규칙·사건·판정·AI 완주 시험
  책임: 배 불타기·물 번짐·금지 구역·차례 사건·버티기 승리·저장 복원·AI 대 AI 완주를 확인한다.
*/ // ------------------------------
import assert from "node:assert/strict";
import { test } from "node:test";
import type { BattleState } from "./battleTypes";
import { applyAction, beginBattle, createBattle, planPhase, runPhase } from "./index";
import { chapter, foe, hero, NO_BONDS } from "./testKit";

function endRound(state: BattleState): BattleState {
  const afterPlayer = applyAction(state, { type: "endPhase" }).state;
  return applyAction(afterPlayer, { type: "endPhase" }).state;
}

test("적이 배 곁에서 행동을 마치면 배가 타고, lossAt척이면 진다", () => {
  const ch = chapter({
    rows: ["......", "......", "..SS..", "ssssss"], deploy: [{ x: 0, y: 0 }],
    units: [foe("t1", "hoplite", 1, 2, 1, { ai: { mode: "idle" } })],
    rules: [{ kind: "burnShips", ships: [{ id: "s1", tiles: [{ x: 2, y: 2 }, { x: 3, y: 2 }] }], lossAt: 1 }],
  });
  const s = createBattle(ch, ["a"], [hero("a", "hoplite", 1)], NO_BONDS, 1);
  const enemyTurn = applyAction(s, { type: "endPhase" }).state;
  const r = applyAction(enemyTurn, { type: "wait", unitId: "t1" });
  assert.ok(r.events.some((e) => e.kind === "shipBurned" && e.shipId === "s1"));
  assert.ok(r.state.flags.includes("ship-burned:s1"));
  assert.equal(r.state.outcome, "defeat");
});

test("적 차례가 끝나면 물이 최대 6칸 번지고, 멈춤 표지가 켜지면 멈춘다", () => {
  const rows = ["..~~..", "..~~..", "..~~..", "..~~.."];
  const ch = chapter({ rows, deploy: [{ x: 0, y: 0 }], units: [foe("t1", "hoplite", 1, 5, 3, { ai: { mode: "idle" } })], rules: [{ kind: "flood", stopFlag: "fire" }] });
  const s = createBattle(ch, ["a"], [hero("a", "hoplite", 1)], NO_BONDS, 11);
  const after = endRound(s);
  const shallow = after.map.tiles.filter((t) => t.terrain === "shallow").length;
  assert.ok(shallow > 0 && shallow <= 6, `번진 칸 ${shallow}`);
  const stopped = endRound({ ...after, flags: [...after.flags, "fire"] });
  assert.equal(stopped.map.tiles.filter((t) => t.terrain !== "plain" && t.terrain !== "water").length, shallow);
});

test("금지 구역에 들어서면 표지가 켜지고 그 표지의 사건이 뒤따른다", () => {
  const ch = chapter({
    rows: FIELD6, deploy: [{ x: 0, y: 3 }], units: [foe("t1", "hoplite", 1, 5, 0, { ai: { mode: "idle" } })],
    rules: [{ kind: "zone", unitId: "patroclus", tiles: [{ x: 2, y: 3 }], flag: "at-walls" }],
    events: [{ id: "apollo", when: { on: "flag", flag: "at-walls" }, actions: [{ do: "scene", sceneId: "apollo-strikes" }, { do: "status", unitIds: ["patroclus"], status: { key: "stripped", turns: -1 } }] }],
  });
  const s = createBattle(ch, ["patroclus"], [hero("patroclus", "hoplite", 1)], NO_BONDS, 1);
  const r = applyAction(s, { type: "move", unitId: "patroclus", to: { x: 2, y: 3 } });
  assert.ok(r.state.flags.includes("at-walls"));
  assert.ok(r.events.some((e) => e.kind === "scene" && e.sceneId === "apollo-strikes"));
  assert.ok(r.state.units.find((u) => u.id === "patroclus")?.statuses.some((x) => x.key === "stripped"));
});

const FIELD6 = ["......", "......", "......", "......"];

test("차례 사건은 그 차례 우리 편이 시작할 때 한 번 뜬다", () => {
  const ch = chapter({
    rows: FIELD6, deploy: [{ x: 0, y: 0 }], units: [foe("t1", "hoplite", 1, 5, 3, { ai: { mode: "idle" } })],
    events: [{ id: "t2", when: { on: "turn", turn: 2 }, actions: [{ do: "scene", sceneId: "second" }] }],
  });
  const s = createBattle(ch, ["a"], [hero("a", "hoplite", 1)], NO_BONDS, 1);
  const p1 = applyAction(s, { type: "endPhase" });
  assert.ok(!p1.events.some((e) => e.kind === "scene"));
  const p2 = applyAction(p1.state, { type: "endPhase" });
  assert.equal(p2.state.turn, 2);
  assert.ok(p2.events.some((e) => e.kind === "scene" && e.sceneId === "second"));
});

test("버티기 목표는 그 차례 적 차례가 끝나면 이긴다", () => {
  const ch = chapter({ rows: FIELD6, deploy: [{ x: 0, y: 0 }], units: [foe("t1", "hoplite", 1, 5, 3, { ai: { mode: "idle" } })], objective: { kind: "survive", turns: 2 } });
  const s = createBattle(ch, ["a"], [hero("a", "hoplite", 1)], NO_BONDS, 1);
  const round1 = endRound(s);
  assert.equal(round1.outcome, null);
  assert.equal(endRound(round1).outcome, "victory");
});

test("판 상태를 JSON으로 저장했다 되살려도 같은 결과가 나온다", () => {
  const ch = chapter({ rows: FIELD6, deploy: [{ x: 0, y: 0 }], units: [foe("t1", "hoplite", 3, 1, 0)] });
  const s = beginBattle(createBattle(ch, ["a"], [hero("a", "hoplite", 3)], NO_BONDS, 99)).state;
  const restored = JSON.parse(JSON.stringify(s)) as BattleState;
  const a = applyAction(s, { type: "attack", unitId: "a", targetId: "t1" });
  const b = applyAction(restored, { type: "attack", unitId: "a", targetId: "t1" });
  assert.deepEqual(a.events, b.events);
  assert.deepEqual(a.state.rng, b.state.rng);
});

test("예언: 다음 적 차례의 행동을 미리 뽑아도 판은 그대로다", () => {
  const ch = chapter({ rows: FIELD6, deploy: [{ x: 0, y: 0 }], units: [foe("t1", "hoplite", 1, 4, 0)] });
  const s = createBattle(ch, ["a"], [hero("a", "hoplite", 1)], NO_BONDS, 1);
  const plan = planPhase(s, "enemy");
  assert.ok(plan.length > 0);
  assert.equal(s.units.find((u) => u.id === "t1")?.x, 4);
});

test("AI 대 AI: 작은 장을 끝까지 돌리면 막히지 않고 판이 끝난다", () => {
  const rows = ["....ff....", "..h....h..", "....ww....", "..........", "...f..f...", ".........."];
  const heights = ["0000000000", "0010000100", "0000000000", "0000000000", "0000000000", "0000000000"];
  const ch = chapter({
    rows, heights, deploy: [{ x: 1, y: 5 }, { x: 3, y: 5 }, { x: 5, y: 5 }, { x: 7, y: 5 }],
    units: [
      foe("t1", "hoplite", 2, 2, 0), foe("t2", "hoplite", 2, 5, 0), foe("t3", "archer", 2, 7, 1),
      foe("t4", "skirmisher", 2, 8, 0), foe("t5", "chariot", 2, 4, 1, { ai: { mode: "guard", radius: 3 } }),
    ],
    loss: [{ kind: "turnLimit", turns: 30 }],
  });
  const roster = [hero("a", "hoplite", 3), hero("b", "archer", 3), hero("c", "hoplite", 3), hero("d", "healer", 3, { weapon: "sword", skills: ["heal"] })];
  let s = beginBattle(createBattle(ch, ["a", "b", "c", "d"], roster, NO_BONDS, 2024)).state;
  for (let i = 0; i < 200 && !s.outcome; i += 1) s = runPhase(s, s.phase).state;
  assert.ok(s.outcome, `끝나지 않음: ${s.turn}차례`);
});
