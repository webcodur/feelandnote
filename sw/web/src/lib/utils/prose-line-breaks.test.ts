import assert from "node:assert/strict";
import { test } from "node:test";
import { doubleProseLineBreaks, normalizeIntroBreaks } from "./prose-line-breaks";

test("여러 문장짜리 줄 사이의 한 줄 개행은 문단 경계가 된다", () => {
  assert.equal(
    doubleProseLineBreaks("첫 문장이다. 둘째 문장이다.\n셋째 문장이다. 넷째 문장이다."),
    "첫 문장이다. 둘째 문장이다.\n\n셋째 문장이다. 넷째 문장이다.",
  );
});

test("한 줄에 한 항목씩 적은 목록은 그대로 둔다", () => {
  const list = "어셔가의 몰락\n검은 고양이\n모르그 가의 살인들";
  assert.equal(doubleProseLineBreaks(list), list);
});

test("한 문장씩 끊은 줄이 끼면 그 경계는 벌리지 않는다", () => {
  const text = "학교로 돌아간다.\n공격이 시작된다. 학생들이 굳은 채 발견된다.\n예언이 현실이 되는 듯하다.";
  assert.equal(doubleProseLineBreaks(text), text);
});

test("번호 목록과 출처 줄은 문장 줄로 치지 않는다", () => {
  const numbered = "1. 본래 마음은 맑다. 흔들리지 않는다.\n2. 괴로움은 집착에서 온다. 놓으면 풀린다.";
  assert.equal(doubleProseLineBreaks(numbered), numbered);
  const quote = "“가장 중요한 책. 그야말로 걸작.”\n_앤절라 더크워스, 《그릿》 저자";
  assert.equal(doubleProseLineBreaks(quote), quote);
});

test("이미 빈 줄로 문단을 나눈 글은 남은 한 줄 개행을 건드리지 않는다", () => {
  const text = "소개 문단이다. 길게 이어진다.\n\n방패는 버렸다. 몸은 살렸다.\n그냥 두어라. 또 구하면 된다.";
  assert.equal(doubleProseLineBreaks(text), text);
});

test("CRLF 개행도 같은 규칙으로 읽는다", () => {
  assert.equal(
    doubleProseLineBreaks("첫 문장이다. 둘째 문장이다.\r\n셋째 문장이다. 넷째 문장이다."),
    "첫 문장이다. 둘째 문장이다.\n\n셋째 문장이다. 넷째 문장이다.",
  );
});

test("문장부호 없이 끝나는 줄끼리의 빈 줄은 붙는 줄로 내린다", () => {
  const verse =
    "미국 남부의 협소하고 단조로운 삶에서\n\n인간 사회의 다양한 갈망과 갈등을 포착해 낸\n\n열정적인 관찰자이자 위대한 이야기꾼, 유도라 웰티";
  assert.equal(
    normalizeIntroBreaks(verse),
    "미국 남부의 협소하고 단조로운 삶에서\n인간 사회의 다양한 갈망과 갈등을 포착해 낸\n열정적인 관찰자이자 위대한 이야기꾼, 유도라 웰티",
  );
});

test("개행 셋 이상의 덩어리 경계는 비문장 줄 사이에서도 문단으로 남는다", () => {
  const stanzas = "열정적인 관찰자이자 위대한 이야기꾼, 유도라 웰티\n\n\n\n전통적인 남부 지역사회의 풍경에";
  assert.equal(
    normalizeIntroBreaks(stanzas),
    "열정적인 관찰자이자 위대한 이야기꾼, 유도라 웰티\n\n전통적인 남부 지역사회의 풍경에",
  );
});

test("문장부호로 끝나는 줄 앞의 빈 줄은 문단 경계로 둔다", () => {
  const prose =
    "비극적 서사로 승화시킨 20세기 최고의 단편들\n\n윌리엄 포크너와 함께 미국 남부 문학을 대표하는 작가의 선집이 나왔다.";
  assert.equal(normalizeIntroBreaks(prose), prose);
});

test("빈 줄이 없는 글에서는 산문 줄 사이 개행을 벌린다", () => {
  assert.equal(
    normalizeIntroBreaks("첫 문장이다. 둘째 문장이다.\n셋째 문장이다. 넷째 문장이다."),
    "첫 문장이다. 둘째 문장이다.\n\n셋째 문장이다. 넷째 문장이다.",
  );
});
