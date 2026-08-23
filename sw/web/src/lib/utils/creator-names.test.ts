import assert from "node:assert/strict";
import { test } from "node:test";

import { collectCreatorNames, splitCreatorNames } from "./creator-names";

/** 조각을 이어 붙이면 언제나 원문이 나와야 한다 — 화면 글자는 한 자도 바뀌지 않는다 */
function assertLossless(raw: string) {
  assert.equal(splitCreatorNames(raw).map((s) => s.text).join(""), raw);
}

test("빈 값은 조각이 없다", () => {
  assert.deepEqual(splitCreatorNames(null), []);
  assert.deepEqual(splitCreatorNames("   "), []);
});

test("이름 하나는 통째로 대조 대상이다", () => {
  assert.deepEqual(splitCreatorNames("한강"), [{ text: "한강", name: "한강" }]);
});

test("쉼표로 묶인 공저를 각각 가른다", () => {
  const names = collectCreatorNames(splitCreatorNames("김위찬, 르네 마보안"));
  assert.deepEqual(names, ["김위찬", "르네 마보안"]);
  assertLossless("김위찬, 르네 마보안");
});

test("역할 표기는 이름에서 뗀다", () => {
  const names = collectCreatorNames(splitCreatorNames("윤인완 글, 양경일 그림"));
  assert.deepEqual(names, ["윤인완", "양경일"]);
  assertLossless("윤인완 글, 양경일 그림");
});

test("괄호 부연과 겹친 역할도 벗긴다", () => {
  const names = collectCreatorNames(splitCreatorNames("홍길동(지은이) 지음"));
  assert.deepEqual(names, ["홍길동"]);
  assertLossless("홍길동(지은이) 지음");
});

test("외 표기를 뗀다", () => {
  assert.deepEqual(collectCreatorNames(splitCreatorNames("정약용 외")), ["정약용"]);
});

test("앰퍼샌드로 이어진 팀 이름은 가르지 않는다", () => {
  assert.deepEqual(collectCreatorNames(splitCreatorNames("Simon & Garfunkel")), [
    "Simon & Garfunkel",
  ]);
  assert.deepEqual(collectCreatorNames(splitCreatorNames("Bob Marley & The Wailers")), [
    "Bob Marley & The Wailers",
  ]);
});

test("빗금으로 나눈 영문 공저를 가른다", () => {
  const names = collectCreatorNames(splitCreatorNames("Powell Colin L/ Persico Joseph E"));
  assert.deepEqual(names, ["Powell Colin L", "Persico Joseph E"]);
  assertLossless("Powell Colin L/ Persico Joseph E");
});

test("가운뎃점으로 나눈 표기를 가른다", () => {
  assert.deepEqual(collectCreatorNames(splitCreatorNames("칼 마르크스·프리드리히 엥겔스")), [
    "칼 마르크스",
    "프리드리히 엥겔스",
  ]);
});

test("역할만 남는 표기는 대조하지 않는다", () => {
  assert.deepEqual(collectCreatorNames(splitCreatorNames("저자 미상")), ["저자 미상"]);
});

test("같은 이름이 겹쳐도 한 번만 대조한다", () => {
  assert.deepEqual(collectCreatorNames(splitCreatorNames("김용, 김용")), ["김용"]);
});
