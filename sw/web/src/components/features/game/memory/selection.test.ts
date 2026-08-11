import assert from "node:assert/strict";
import test from "node:test";
import { getMemorySelectionGate } from "./selection";

test("정답 연출 중 다른 카드를 누르면 현재 짝을 마치고 그 클릭을 이어간다", () => {
  assert.equal(getMemorySelectionGate({
    pairResult: "match",
    isOpen: false,
    locked: true,
    isMatched: false,
  }), "advance-match");
});

test("정답 연출 카드와 이미 제거된 카드는 기존 안전 동작을 유지한다", () => {
  assert.equal(getMemorySelectionGate({
    pairResult: "match",
    isOpen: true,
    locked: true,
    isMatched: false,
  }), "finish-result");
  assert.equal(getMemorySelectionGate({
    pairResult: null,
    isOpen: false,
    locked: false,
    isMatched: true,
  }), "ignore");
});
