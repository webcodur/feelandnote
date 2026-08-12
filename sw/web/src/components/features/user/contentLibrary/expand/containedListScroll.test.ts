import assert from "node:assert/strict";
import test from "node:test";

import { getContainedListScrollDelta } from "./containedListScroll";

test("선택 항목이 목록 위로 가려지면 목록을 위로 옮긴다", () => {
  assert.equal(
    getContainedListScrollDelta({ top: 100, bottom: 400 }, { top: 72, bottom: 116 }),
    -28,
  );
});

test("선택 항목이 목록 아래로 가려지면 목록을 아래로 옮긴다", () => {
  assert.equal(
    getContainedListScrollDelta({ top: 100, bottom: 400 }, { top: 392, bottom: 444 }),
    44,
  );
});

test("선택 항목이 이미 목록 안에 있으면 움직이지 않는다", () => {
  assert.equal(
    getContainedListScrollDelta({ top: 100, bottom: 400 }, { top: 180, bottom: 224 }),
    0,
  );
});
