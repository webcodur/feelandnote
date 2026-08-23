import assert from "node:assert/strict";
import { test } from "node:test";

import { hasReviewContent } from "./reviewContent";

test("감상을 안 쓴 기록은 내용 없음으로 본다", () => {
  // 회원 기록 대부분이 이 모양이다 — 여기서 참이 되면 출처 누락 경고가 잘못 쏟아진다
  assert.equal(hasReviewContent(null, null), false);
  assert.equal(hasReviewContent(undefined, undefined), false);
  assert.equal(hasReviewContent(null, []), false);
});

test("공백뿐인 감상도 내용 없음으로 본다", () => {
  assert.equal(hasReviewContent("   \n ", null), false);
});

test("감상 글이 있으면 내용 있음", () => {
  assert.equal(hasReviewContent("좋았다", null), true);
});

test("감상 프리셋만 있어도 내용 있음", () => {
  assert.equal(hasReviewContent(null, ["재미있다"]), true);
});
