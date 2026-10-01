/*
  파일명: lib/game/hegemony/rng.ts
  기능: 무작위 도우미
  책임: 섞기·뽑기와 재현 가능한 난수(시뮬레이션 검증용)를 제공한다. 엔진은 난수를 인자로만 받는다.
*/

import type { Rng } from "./types";

export const defaultRng: Rng = Math.random;

/** 판 씨앗과 용도 이름으로 갈래 난수를 만든다 — 상태 전이를 순수 함수로 두기 위해 쓴다 */
export function rngFor(seed: number, ...parts: (string | number)[]): Rng {
  let h = 0x811c9dc5 ^ seed;
  for (const ch of parts.join(":")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return seededRng(h >>> 0);
}

export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** 같은 씨앗이면 같은 수열을 내는 난수 (mulberry32) */
export function seededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function sample<T>(items: readonly T[], count: number, rng: Rng): T[] {
  return shuffle(items, rng).slice(0, count);
}

export function pickOne<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

/** 값이 클수록 잘 뽑히는 확률 분포. temperature가 크면 고르게 퍼진다 */
export function softmax(values: readonly number[], temperature: number): number[] {
  const t = Math.max(temperature, 1e-6);
  const max = Math.max(...values);
  const weights = values.map((v) => Math.exp((v - max) / t));
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / sum);
}

export function pickWeighted(weights: readonly number[], rng: Rng): number {
  const roll = rng();
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (roll < acc) return i;
  }
  return weights.length - 1;
}

export function argMax(values: readonly number[]): number {
  return values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
}
