/*
  파일명: components/features/game/myth/troy/campaign/journey.test.ts
  기능: 트로이 전쟁 원정 흉내(균형 지킴이)
  책임: 1장부터 10장까지 실제 진행 코드(rosterFor·recordVictory, 진영에 남은 영웅의 몫 포함)로 수준을 이어 가며 AI 대 AI로 돈다.
        우리 편은 조심스러운 AI다(반드시 지켜야 하는 장수는 지키고, 닿기 목표 장수는 그 칸을 찾아간다. 신을 벨 힘을 받으면 신을 노린다). 보통 난이도에서 장마다
        세 판 안에 이기는지, 난이도가 적만 바꾸는지 본다. 판마다 시드가 정해져 있어 결과가 늘 같다.
*/ // ------------------------------
import assert from "node:assert/strict";
import { test } from "node:test";
import { beginBattle, createBattle, hasStatus, runPhase } from "../engine";
import type { BattleState } from "../engine";
import type { Difficulty } from "../model";
import { tuneBattle } from "./difficulty";
import { CHAPTERS } from "./index";
import { emptySave, pickable, recordVictory, rosterFor } from "./progress";

// 싸워야 하는 대장(지키지 않고 앞장선다)
const BRAWLERS = ["achilles", "diomedes"];

// 신을 벨 힘(divineStrike)을 받은 장수는 벨 수 없던 신을 노린다. 사람이라면 장면을 보고 그렇게 한다
function aimAtGods(state: BattleState): BattleState {
  const gods = state.units.filter((u) => u.side === "enemy" && u.tags.includes("invulnerable")).map((u) => u.id);
  const units = state.units.map((u) => {
    if (u.side !== "player" || !u.ai) return u;
    const targetIds = gods.length > 0 && hasStatus(u, "divineStrike") ? gods : undefined;
    return u.ai.targetIds === targetIds ? u : { ...u, ai: { ...u.ai, targetIds } };
  });
  return { ...state, units };
}

function play(state: BattleState, entry: (typeof CHAPTERS)[number]): BattleState {
  const goal = entry.battle.objective;
  const lords = entry.battle.loss.flatMap((r) => (r.kind === "unitFalls" ? r.unitIds : []));
  const units = state.units.map((u) => {
    if (u.side !== "player") return u;
    if (goal.kind === "reach" && goal.unitIds.includes(u.id)) return { ...u, ai: { mode: "seek" as const, goal: goal.tiles } };
    return lords.includes(u.id) && !BRAWLERS.includes(u.id) ? { ...u, ai: { mode: "guard" as const, radius: 3 } } : { ...u, ai: { mode: "charge" as const } };
  });
  let s = beginBattle({ ...state, units }).state;
  for (let i = 0; i < 400 && !s.outcome; i += 1) s = runPhase(s.phase === "player" ? aimAtGods(s) : s, s.phase).state;
  return s;
}

// 원정을 끝까지(지면 새 판으로 다시, 장마다 최대 tries번). 장마다 걸린 판 수를 돌려준다(못 넘기면 거기서 멈춘다)
function journey(difficulty: Difficulty, run: number, tries: number): number[] {
  let save = { ...emptySave(), difficulty };
  const spent: number[] = [];
  for (const entry of CHAPTERS) {
    const options = pickable(entry, save);
    const roster = rosterFor(entry, save);
    const forced = entry.battle.forced.filter((s) => options.includes(s));
    const level = (slug: string) => roster.find((h) => h.slug === slug)?.level ?? 0;
    const rest = options.filter((s) => !forced.includes(s)).sort((a, b) => level(b) - level(a));
    const deployed = [...forced, ...rest].slice(0, entry.battle.maxDeploy);
    let won: BattleState | null = null;
    let n = 0;
    while (!won && n < tries) {
      n += 1;
      const s = play(createBattle(tuneBattle(entry.battle, difficulty), deployed, roster, [], run * 1000 + entry.no * 37 + n), entry);
      won = s.outcome === "victory" ? s : null;
    }
    if (!won) break;
    spent.push(n);
    save = recordVictory(save, won);
  }
  return spent;
}

test("보통: 수준을 이어 가며 열 장을 장마다 세 판 안에 넘는다", () => {
  for (const run of [1, 2]) {
    const spent = journey("normal", run, 3);
    console.log(`보통 ${run}: ${spent.map((n, i) => `${i + 1}장 ${n}판`).join(" · ")}`);
    assert.equal(spent.length, CHAPTERS.length, `${spent.length + 1}장에서 막힘`);
  }
});

test("쉬움: 열 장 모두 첫 판이나 두 번째 판에 넘는다", () => {
  const spent = journey("easy", 3, 2);
  console.log(`쉬움: ${spent.map((n, i) => `${i + 1}장 ${n}판`).join(" · ")}`);
  assert.equal(spent.length, CHAPTERS.length);
});

test("난이도는 적의 능력치만 바꾸고 우리 편·아군·수준은 그대로 둔다", () => {
  const base = CHAPTERS[3].battle;
  const easy = tuneBattle(base, "easy");
  const hard = tuneBattle(base, "hard");
  const sarpedon = (b: typeof base) => b.units.find((u) => u.id === "sarpedon");
  assert.ok((sarpedon(easy)?.stats?.hp ?? 0) < (sarpedon(base)?.stats?.hp ?? 0));
  assert.ok((sarpedon(hard)?.stats?.str ?? 0) > (sarpedon(base)?.stats?.str ?? 0));
  assert.equal(sarpedon(easy)?.level, sarpedon(base)?.level);
  const myrmidons = (b: typeof base) => b.events.flatMap((e) => e.actions.flatMap((a) => (a.do === "spawn" ? a.units : []))).filter((u) => u.side === "player");
  assert.deepEqual(myrmidons(easy), myrmidons(base));
  assert.equal(tuneBattle(base, "normal"), base);
});
