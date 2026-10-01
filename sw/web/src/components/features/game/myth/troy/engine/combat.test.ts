/*
  파일명: components/features/game/myth/troy/engine/combat.test.ts
  기능: 트로이 전쟁 전투 계산 시험
  책임: 이동 범위·높이 제한, 예측 수치, 반격·연속 공격, 인연·맞수·적진의 벗, 신의 몸, 여신의 비호, 물러남을 확인한다.
*/ // ------------------------------
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyAction, beginBattle, createBattle, forecast, reachable, targetsFrom } from "./index";
import { chapter, foe, hero, NO_BONDS } from "./testKit";

const FIELD = ["......", "......", "......", "......"];

test("출진 칸에 차례대로 서고 패배 조건의 장수는 lord가 된다", () => {
  const ch = chapter({ rows: FIELD, deploy: [{ x: 0, y: 0 }, { x: 0, y: 1 }], loss: [{ kind: "unitFalls", unitIds: ["achilles"] }] });
  const s = createBattle(ch, ["achilles", "patroclus"], [hero("achilles", "hoplite", 1), hero("patroclus", "hoplite", 1)], NO_BONDS, 7);
  const a = s.units.find((u) => u.id === "achilles");
  assert.deepEqual([a?.x, a?.y], [0, 0]);
  assert.ok(a?.tags.includes("lord"));
  assert.equal(s.units.find((u) => u.id === "patroclus")?.y, 1);
});

test("한 단 넘는 높이는 오르지 못하고 숲은 두 칸 비용이다", () => {
  const ch = chapter({ rows: [".f....", "......"], heights: ["002000", "000000"], deploy: [{ x: 0, y: 0 }] });
  const s = createBattle(ch, ["a"], [hero("a", "hoplite", 1, { stats: { hp: 20, str: 6, skl: 5, spd: 4, def: 6, res: 1, mov: 2 } })], NO_BONDS, 1);
  const tiles = reachable(s, "a").map((p) => `${p.x},${p.y}`);
  assert.ok(tiles.includes("1,0"), "숲 한 칸(비용 2)");
  assert.ok(!tiles.includes("2,0"), "두 단 높은 칸");
  assert.ok(tiles.includes("1,1"));
  assert.ok(!tiles.includes("2,1"), "비용 3은 이동력 2 밖");
});

test("예측: 같은 수준 중갑 보병끼리 피해 5·명중 87·반격 있음", () => {
  const ch = chapter({ rows: FIELD, deploy: [{ x: 0, y: 0 }], units: [foe("t1", "hoplite", 1, 1, 0)] });
  const s = createBattle(ch, ["a"], [hero("a", "hoplite", 1)], NO_BONDS, 1);
  const f = forecast(s, "a", "t1");
  assert.ok(f);
  assert.equal(f.attacker.damage, 5);
  assert.equal(f.attacker.hit, 87);
  assert.equal(f.attacker.crit, 1);
  assert.equal(f.defender.strikes, 1);
});

test("속도가 4 넘게 빠르면 두 번 치고, 활은 곁의 적에게 반격하지 못한다", () => {
  // 궁수 1수준 속도는 6 — 10이면 4 차이
  const fast = hero("a", "hoplite", 1, { stats: { hp: 20, str: 6, skl: 5, spd: 10, def: 6, res: 1, mov: 4 } });
  const ch = chapter({ rows: FIELD, deploy: [{ x: 0, y: 0 }], units: [foe("bow", "archer", 1, 1, 0)] });
  const s = createBattle(ch, ["a"], [fast], NO_BONDS, 1);
  const f = forecast(s, "a", "bow");
  assert.equal(f?.attacker.strikes, 2);
  assert.equal(f?.defender.strikes, 0);
});

test("인연이 곁에 서면 명중 +10과 보정 이유가 붙는다", () => {
  const bonds = [{ a: "achilles", b: "patroclus", kind: "bond" as const, type: "friend", note: null }];
  const ch = chapter({ rows: FIELD, deploy: [{ x: 0, y: 0 }, { x: 0, y: 1 }], units: [foe("t1", "hoplite", 1, 1, 0)] });
  const s = createBattle(ch, ["achilles", "patroclus"], [hero("achilles", "hoplite", 1), hero("patroclus", "hoplite", 1)], bonds, 1);
  const f = forecast(s, "achilles", "t1");
  assert.equal(f?.attacker.hit, 97);
  assert.ok(f?.notes.some((n) => n.key === "bond" && n.value === "patroclus"));
});

test("맞수는 처음 맞붙을 때 한 번만 장면을 내고 치명 +15", () => {
  const bonds = [{ a: "hector", b: "achilles", kind: "rival" as const, type: "rival", note: "헥토르와 아킬레우스" }];
  const ch = chapter({ rows: FIELD, deploy: [{ x: 0, y: 0 }], units: [foe("hector", "hoplite", 5, 1, 0, { figureSlug: "hector", stats: { hp: 60 } })] });
  const s = createBattle(ch, ["achilles"], [hero("achilles", "hoplite", 1)], bonds, 3);
  assert.equal(forecast(s, "achilles", "hector")?.attacker.crit, 1 + 15 - 0);
  const first = applyAction(s, { type: "attack", unitId: "achilles", targetId: "hector" });
  assert.equal(first.events.filter((e) => e.kind === "rivalClash").length, 1);
  const again = { ...first.state, units: first.state.units.map((u) => ({ ...u, acted: false, moved: false })) };
  const second = applyAction(again, { type: "attack", unitId: "achilles", targetId: "hector" });
  assert.equal(second.events.filter((e) => e.kind === "rivalClash").length, 0);
});

test("적진의 벗은 서로 공격 대상이 되지 않는다", () => {
  const ch = chapter({
    rows: FIELD, deploy: [{ x: 0, y: 0 }], units: [foe("glaucus", "hoplite", 1, 1, 0, { figureSlug: "glaucus" })],
    rules: [{ kind: "truce", pairs: [["diomedes", "glaucus"]] }],
  });
  const s = createBattle(ch, ["diomedes"], [hero("diomedes", "hoplite", 1)], NO_BONDS, 1);
  assert.equal(forecast(s, "diomedes", "glaucus"), null);
  assert.deepEqual(targetsFrom(s, "diomedes", { x: 0, y: 0 }), []);
});

test("신은 신을 치는 힘(divineStrike) 없이는 다치지 않는다", () => {
  const ch = chapter({
    rows: FIELD, deploy: [{ x: 0, y: 0 }],
    units: [foe("aphrodite", "god", 1, 1, 0, { tags: ["divine", "invulnerable"], ai: { mode: "idle" } })],
  });
  const diomedes = hero("diomedes", "hoplite", 5, { skills: ["athenaBlessing"] });
  const s = createBattle(ch, ["diomedes"], [diomedes], NO_BONDS, 1);
  assert.equal(forecast(s, "diomedes", "aphrodite")?.attacker.damage, 0);
  const blessed = applyAction(s, { type: "skill", unitId: "diomedes", skill: "athenaBlessing" });
  assert.ok((forecast(blessed.state, "diomedes", "aphrodite")?.attacker.damage ?? 0) > 0);
});

test("여신의 비호: 처음 쓰러질 피해를 받으면 물러나고, retreatBelow는 기준 아래에서 물러난다", () => {
  const strong = hero("a", "hoplite", 1, { stats: { hp: 30, str: 30, skl: 30, spd: 5, def: 9, res: 1, mov: 4 } });
  const ch = chapter({
    rows: FIELD, deploy: [{ x: 0, y: 0 }, { x: 2, y: 1 }],
    units: [foe("aeneas", "hoplite", 1, 1, 0, { skills: ["goddessRescue"] }), foe("hector", "hoplite", 9, 3, 1, { retreatBelow: 0.95 })],
    events: [{ id: "back", when: { on: "retreated", unitId: "aeneas" }, actions: [{ do: "scene", sceneId: "aeneas-rescued" }] }],
  });
  const s = createBattle(ch, ["a", "b"], [strong, { ...strong, slug: "b" }], NO_BONDS, 5);
  const r = applyAction(s, { type: "attack", unitId: "a", targetId: "aeneas" });
  assert.ok(r.state.retreated.includes("aeneas"));
  assert.ok(!r.state.fallen.includes("aeneas"));
  assert.ok(r.events.some((e) => e.kind === "scene" && e.sceneId === "aeneas-rescued"));
  const r2 = applyAction(r.state, { type: "attack", unitId: "b", targetId: "hector" });
  assert.ok(r2.state.retreated.includes("hector"));
});

test("시작 사건의 hp 행동은 다친 채 나서게 한다", () => {
  const ch = chapter({
    rows: FIELD, deploy: [{ x: 0, y: 0 }], units: [foe("t1", "hoplite", 1, 5, 3)],
    events: [{ id: "hurt", when: { on: "start" }, actions: [{ do: "hp", unitIds: ["menelaus"], ratio: 0.7 }, { do: "scene", sceneId: "intro-hit" }] }],
  });
  const s = createBattle(ch, ["menelaus"], [hero("menelaus", "hoplite", 1)], NO_BONDS, 1);
  const r = beginBattle(s);
  assert.equal(r.state.units.find((u) => u.id === "menelaus")?.hp, 14);
  assert.ok(r.events.some((e) => e.kind === "scene" && e.sceneId === "intro-hit"));
});
