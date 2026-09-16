import assert from "node:assert/strict";
import { test } from "node:test";
import { doubleProseLineBreaks } from "./prose-line-breaks";

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
