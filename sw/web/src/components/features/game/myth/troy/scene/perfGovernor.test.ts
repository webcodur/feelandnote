/*
  파일명: components/features/game/myth/troy/scene/perfGovernor.test.ts
  기능: 동적 해상도 시험
  책임: 느린 초가 이어질 때만 배율을 한 단씩 낮추고, 막 시작한 몇 초는 재지 않으며, 낮춘 배율을 다음 판이 이어 쓰는지 본다.
*/ // ------------------------------
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { forgetRatio, PerfGovernor } from "./perfGovernor";

beforeEach(() => forgetRatio());

function feed(g: PerfGovernor, fps: number[], start: number): (number | null)[] {
  return fps.map((f, i) => g.sample(f, start + i * 1000));
}

test("빠르면 그대로 두고, 3초 이어 느리면 한 단 낮춘다", () => {
  const g = new PerfGovernor(2, 0);
  assert.deepEqual(feed(g, [60, 60, 60], 3000), [null, null, null]);
  assert.deepEqual(feed(g, [30, 30, 30], 6000), [null, null, 1.5]);
  assert.equal(g.ratio, 1.5);
});

test("느린 초가 끊기면 다시 센다", () => {
  const g = new PerfGovernor(2, 0);
  assert.deepEqual(feed(g, [30, 30, 60, 30, 30], 3000), [null, null, null, null, null]);
  assert.equal(g.ratio, 2);
});

test("막 시작했거나 크기가 바뀐 직후의 끊김은 세지 않는다", () => {
  const g = new PerfGovernor(2, 0);
  assert.deepEqual(feed(g, [10, 10], 500), [null, null]);
  g.rest(3000);
  assert.deepEqual(feed(g, [10, 10, 10], 3500), [null, null, null]);
  assert.equal(g.ratio, 2);
});

test("가장 낮은 단계(0.75)에서 멈추고, 낮춘 배율은 다음 판이 이어 쓴다", () => {
  const g = new PerfGovernor(1, 0);
  feed(g, [20, 20, 20], 3000);
  assert.equal(g.ratio, 0.75);
  assert.deepEqual(feed(g, [20, 20, 20, 20, 20, 20], 20000), [null, null, null, null, null, null]);
  assert.equal(new PerfGovernor(2, 0).ratio, 0.75);
});
