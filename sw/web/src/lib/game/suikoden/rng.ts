// 천도 v2 — 판에 묶인 난수. 상태에 씨앗을 넣어 두어 불러온 판이 같은 흐름을 잇는다.

interface RngHolder {
  rngState: number
}

/** mulberry32 한 걸음. 상태를 제자리에서 갱신하고 [0,1) 값을 돌려준다 */
export function rand(s: RngHolder): number {
  let t = (s.rngState = (s.rngState + 0x6d2b79f5) >>> 0)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function randInt(s: RngHolder, min: number, max: number): number {
  return min + Math.floor(rand(s) * (max - min + 1))
}

export function chance(s: RngHolder, p: number): boolean {
  return rand(s) < p
}

export function pick<T>(s: RngHolder, list: readonly T[]): T {
  return list[Math.floor(rand(s) * list.length)]
}

/** 가중치 뽑기. 가중치 합이 0이면 null */
export function pickWeighted<T>(s: RngHolder, list: readonly T[], weight: (item: T) => number): T | null {
  let total = 0
  for (const item of list) total += Math.max(0, weight(item))
  if (total <= 0) return null
  let roll = rand(s) * total
  for (const item of list) {
    roll -= Math.max(0, weight(item))
    if (roll < 0) return item
  }
  return list[list.length - 1] ?? null
}

export function shuffleInPlace<T>(s: RngHolder, list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

/** 문자열 → 32비트 해시(FNV-1a). 인물마다 고정된 흔들림을 만들 때 쓴다 */
export function hashString(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** 해시에서 뽑은 [-1, 1) 값 */
export function hashUnit(text: string): number {
  return (hashString(text) / 4294967296) * 2 - 1
}
