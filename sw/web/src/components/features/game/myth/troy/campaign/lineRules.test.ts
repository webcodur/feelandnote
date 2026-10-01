/*
  파일명: components/features/game/myth/troy/campaign/lineRules.test.ts
  기능: 인물 고유 대사 거르기 시험
  책임: 상대 이름을 부르는 외침·추모와 복수·장 배경·곁의 우리 편·부칭·겹치는 이름·이긴 뒤 한마디의 규칙이 DB 대사(예시 줄)에 맞게 도는지 본다.
*/ // ------------------------------
import assert from "node:assert/strict";
import { test } from "node:test";
import { lineFits, pickFitting, type CastName, type LineAsk } from "./lineRules";
import { lineScene } from "./lineScene";
import { FIGURE_NAMES } from "./names";

const CAST: CastName[] = Object.entries(FIGURE_NAMES).map(([slug, n]) => {
  const words = n.ko.split(" ");
  return { slug, names: [n.ko, words[words.length - 1]].filter((x) => [...x].length >= 2) };
});
const ask = (speaker: string, situation: LineAsk["situation"], target: string | null = null): LineAsk => ({ speaker, situation, target });
const at = (ch: string, flags: string[] = [], finished = false, allies: string[] = [], comradeFell = false) => lineScene(ch, flags, finished, { allies, comradeFell });

test("상대 이름을 부르는 외침은 그 상대를 칠 때만, 맞으면 먼저 고른다", () => {
  const lines = ["헥토르! 달아날 곳은 없다!", "펠리온의 창을 받아라!"];
  assert.equal(pickFitting(lines, ask("achilles", "clash_attack", "hector"), at("ch01"), CAST, 0.9), lines[0]);
  assert.equal(pickFitting(lines, ask("achilles", "clash_attack", "paris"), at("ch01"), CAST, 0.1), lines[1]);
});

test("복수·추모 줄은 그 사람이 이야기에서 죽은 뒤에만", () => {
  const line = "파트로클로스의 복수다!";
  assert.equal(lineFits(line, ask("achilles", "clash_attack", "hector"), at("ch01"), CAST), false);
  assert.equal(lineFits(line, ask("achilles", "clash_attack", "hector"), at("ch05", ["dead:patroclus"]), CAST), true);
  // 6장이 끝나야 헥토르가 죽었다고 말할 수 있다
  const win = "트로이여, 이제 그대들을 지킬 헥토르는 없소.";
  assert.equal(lineFits(win, ask("achilles", "battle_win"), at("ch01", [], true), CAST), false);
  assert.equal(lineFits(win, ask("achilles", "battle_win"), at("ch06", [], true), CAST), true);
});

test("장 배경이 없는 말은 버린다", () => {
  assert.equal(lineFits("친구의 갑옷으로 막겠습니다.", ask("patroclus", "clash_attack"), at("ch01"), CAST), false);
  assert.equal(lineFits("친구의 갑옷으로 막겠습니다.", ask("patroclus", "clash_attack"), at("ch04"), CAST), true);
  assert.equal(lineFits("밤의 습격은 짧게 끝낸다.", ask("diomedes", "clash_attack"), at("ch02"), CAST), false);
  assert.equal(lineFits("가족의 길을 비키시오.", ask("aeneas", "clash_attack"), at("ch10"), CAST), true);
  assert.equal(lineFits("레소스의 말과 함께 밤길을 빠져나왔다.", ask("diomedes", "battle_win"), at("ch10", [], true), CAST), false);
});

test("곁의 우리 편이 있어야 하는 말", () => {
  assert.equal(lineFits("방패를 열어라!", ask("teucer", "clash_attack"), at("ch10", [], false, ["teucer"]), CAST), false);
  assert.equal(lineFits("방패를 열어라!", ask("teucer", "clash_attack"), at("ch01", [], false, ["ajax-the-great"]), CAST), true);
  assert.equal(lineFits("메리오네스, 함께 간다!", ask("idomeneus", "clash_attack"), at("ch02", [], false, ["idomeneus"]), CAST), false);
  assert.equal(lineFits("메리오네스, 함께 간다!", ask("idomeneus", "clash_attack"), at("ch02", [], false, ["meriones"]), CAST), true);
  assert.equal(lineFits("동료의 몸에서 물러서라.", ask("ajax-the-great", "clash_attack"), at("ch03", [], false, [], true), CAST), true);
  assert.equal(lineFits("동료의 몸에서 물러서라.", ask("ajax-the-great", "clash_attack"), at("ch03"), CAST), false);
});

test("부칭·제 이름·겹치는 이름은 남으로 치지 않는다", () => {
  // 네스토르가 곁에 없어도 「네스토르의 아들」은 된다
  assert.equal(lineFits("네스토르의 아들 안틸로코스가 왔다.", ask("antilochus", "roll_call"), at("ch10"), CAST), true);
  // 「아가멤논」 안의 「멤논」을 멤논으로 세지 않는다
  assert.equal(lineFits("아카이아의 총사령관 아가멤논이 왔다.", ask("agamemnon", "roll_call"), at("ch03"), CAST), true);
  // 소 아이아스의 「두 아이아스」는 제 이름이다(함선 앞이라 3장)
  assert.equal(lineFits("두 아이아스가 붙으면 함선 앞은 벽이 된다.", ask("ajax-the-lesser", "battle_win"), at("ch03", [], true), CAST), true);
});

test("이긴 뒤 한마디는 그 장에서 방금 있었던 일의 인물만 부른다", () => {
  const line = "아킬레우스의 무구는 내가 가져가겠네.";
  assert.equal(lineFits(line, ask("odysseus", "battle_win"), at("ch01", [], true, ["achilles"]), CAST), false);
  assert.equal(lineFits(line, ask("odysseus", "battle_win"), at("ch09", [], true), CAST), true);
  assert.equal(lineFits("아프로디테가 숨겨 주지 않았다면 이 전쟁은 여기서 끝났소.", ask("menelaus", "battle_win"), at("ch02", [], true), CAST), true);
  assert.equal(lineFits("아프로디테가 숨겨 주지 않았다면 이 전쟁은 여기서 끝났소.", ask("menelaus", "battle_win"), at("ch07", [], true), CAST), false);
});
