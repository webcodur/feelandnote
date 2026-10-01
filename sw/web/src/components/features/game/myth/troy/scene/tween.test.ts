/*
  파일명: components/features/game/myth/troy/scene/tween.test.ts
  기능: 연출 시계 검사
  책임: 빠르기(scale)를 올리면 같은 연출이 그 몫만큼 빨리 끝나고, 보통 빠르기는 전과 같이 흐르는지 본다.
*/ // ------------------------------
import assert from "node:assert/strict";
import { test } from "node:test";
import { Tweens } from "./tween";

// 그리는 고리를 흉내 낸다: t0부터 step초씩 update를 부르고, 일이 끝난 시각(초)을 돌려준다
async function finishTime(scale: number, dur: number): Promise<number> {
  const tw = new Tweens();
  tw.scale = scale;
  let now = 100;
  tw.update(now);
  let done = false;
  void tw.run(dur, () => {}).then(() => { done = true; });
  for (let i = 0; i < 1000 && !done; i += 1) {
    now += 1 / 60;
    tw.update(now);
    await Promise.resolve();
  }
  return now - 100;
}

test("보통 빠르기는 적은 시간 그대로 흐른다", async () => {
  const t = await finishTime(1, 1);
  assert.ok(t >= 0.99 && t < 1.05, `1초 연출이 ${t.toFixed(3)}초`);
});

test("빠르기 2는 같은 연출을 절반 시간에 끝낸다", async () => {
  const t = await finishTime(2, 1);
  assert.ok(t >= 0.49 && t < 0.53, `1초 연출이 ${t.toFixed(3)}초`);
});

test("도중에 빠르기를 바꾸면 남은 몫만 빨라진다", async () => {
  const tw = new Tweens();
  let now = 10;
  tw.update(now);
  let k = 0;
  void tw.run(1, (v) => { k = v; }, (x) => x);
  now += 0.5;
  tw.update(now);
  assert.ok(Math.abs(k - 0.5) < 1e-6);
  tw.scale = 2;
  now += 0.25;
  tw.update(now);
  assert.ok(Math.abs(k - 1) < 1e-6, `k=${k}`);
});
