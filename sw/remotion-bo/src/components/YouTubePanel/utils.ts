import type { EpisodeData, VariantKey } from './types'

export function parseVariantKey(key: string): { lang: 'ko' | 'en'; type: 'longform' | 'shorts'; shortsIndex: number } {
  const [lang, kind, idxStr] = key.split('-') as [string, string, string | undefined]
  if (kind === 'longform') return { lang: lang as 'ko' | 'en', type: 'longform', shortsIndex: 0 }
  // ko-shorts-1, ko-shorts-2 … (1-based 필수)
  const shortsIndex = parseInt(idxStr ?? '1', 10)
  return { lang: lang as 'ko' | 'en', type: 'shorts', shortsIndex }
}

export function buildVariantKeys(epKo: EpisodeData | null, epEn: EpisodeData | null): VariantKey[] {
  const keys: VariantKey[] = []
  if (epKo) {
    keys.push('ko-longform')
    const koShortsCount = epKo.shorts?.length ?? 0
    for (let i = 0; i < koShortsCount; i++) keys.push(`ko-shorts-${i + 1}`)
  }
  if (epEn) {
    keys.push('en-longform')
    const enShortsCount = epEn.shorts?.length ?? 0
    for (let i = 0; i < enShortsCount; i++) keys.push(`en-shorts-${i + 1}`)
  }
  return keys
}

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`
  return `${(bytes / 1024).toFixed(0)}KB`
}
