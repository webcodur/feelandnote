/*
  파일명: components/features/game/myth/troy/engine/rng.ts
  기능: 트로이 전쟁 판의 시드 난수
  책임: 판 상태에 숫자 하나로 담기는 mulberry32 난수. 같은 상태에서 같은 결과가 나와 저장·복원과 시험이 맞아떨어진다.
*/ // ------------------------------

// [0, 1) 값과 다음 상태
export function nextRandom(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

export function rollPercent(seed: number, pct: number): [boolean, number] {
  const [value, next] = nextRandom(seed);
  return [value * 100 < pct, next];
}

interface Seeded {
  rng: number;
}

// 판 상태의 난수를 한 번 쓴다(복제한 상태에만 부른다)
export function roll(state: Seeded, pct: number): boolean {
  const [ok, next] = rollPercent(state.rng, pct);
  state.rng = next;
  return ok;
}

// 0 이상 n 미만 정수
export function pick(state: Seeded, n: number): number {
  const [value, next] = nextRandom(state.rng);
  state.rng = next;
  return Math.min(n - 1, Math.floor(value * n));
}

// 배열을 제자리에서 섞는다(피셔-예이츠)
export function shuffle<T>(state: Seeded, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = pick(state, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
