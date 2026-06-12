import type { EpisodeData, VariantKey } from './types'

export function parseVariantKey(key: string): { lang: 'ko' | 'en'; type: 'longform' | 'shorts'; shortsIndex: number } {
  const [lang, kind, idxStr] = key.split('-') as [string, string, string | undefined]
  if (kind === 'longform') return { lang: lang as 'ko' | 'en', type: 'longform', shortsIndex: 0 }
  // ko-shorts-1, ko-shorts-2 … (1-based 필수)
  const shortsIndex = parseInt(idxStr ?? '1', 10)
  return { lang: lang as 'ko' | 'en', type: 'shorts', shortsIndex }
}

/** 쇼츠 배열 → 고정 slot 목록 (slot 없으면 폴더순 1-based 폴백, 오름차순) */
export function shortsSlots(ep: EpisodeData | null): number[] {
  const arr = ep?.shorts ?? []
  return arr
    .map((s, i) => (typeof s.slot === 'number' ? s.slot : i + 1))
    .sort((a, b) => a - b)
}

/** 고정 slot으로 쇼츠 탐색 — 배열 위치 아님 (결번이 끼어도 안 밀림) */
export function findShortsBySlot<T extends { slot?: number }>(shorts: T[] | undefined, slot: number): T | undefined {
  return shorts?.find((s, i) => (typeof s.slot === 'number' ? s.slot : i + 1) === slot)
}

export function buildVariantKeys(epKo: EpisodeData | null, epEn: EpisodeData | null): VariantKey[] {
  const keys: VariantKey[] = []
  if (epKo) {
    keys.push('ko-longform')
    for (const slot of shortsSlots(epKo)) keys.push(`ko-shorts-${slot}`)
  }
  if (epEn) {
    keys.push('en-longform')
    for (const slot of shortsSlots(epEn)) keys.push(`en-shorts-${slot}`)
  }
  return keys
}

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`
  return `${(bytes / 1024).toFixed(0)}KB`
}
