/*
  파일명: components/features/game/myth/shared/rng.ts
  기능: 신화 게임 공용 난수
  책임: 같은 씨앗이면 같은 판이 나오게 해 엔진 검증과 재현을 쉽게 한다.
*/ // ------------------------------

export type Rng = () => number;

// mulberry32 — 32비트 씨앗 하나로 [0, 1) 난수열을 만든다
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromText(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickOne<T>(items: readonly T[], rng: Rng): T | undefined {
  return items.length > 0 ? items[Math.floor(rng() * items.length)] : undefined;
}

export function sample<T>(items: readonly T[], count: number, rng: Rng): T[] {
  return shuffle(items, rng).slice(0, count);
}
