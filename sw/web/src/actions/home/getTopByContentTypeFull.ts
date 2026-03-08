'use server'

import { getCelebs } from './getCelebs'
import type { CelebProfile } from '@/types/home'

const CONTENT_TYPE_LABELS: Record<string, { ko: string; en: string }> = {
  BOOK: { ko: '책', en: 'Book' },
  VIDEO: { ko: '영화/드라마', en: 'Film' },
  GAME: { ko: '게임', en: 'Game' },
  MUSIC: { ko: '음악', en: 'Music' },
}

export interface TopByTypeFullEntry {
  type: string
  label: { ko: string; en: string }
  celebs: (CelebProfile & { typeCount: number })[]
}

export async function getTopByContentTypeFull(): Promise<TopByTypeFullEntry[]> {
  const types = ['BOOK', 'VIDEO', 'GAME', 'MUSIC']

  const results = await Promise.all(
    types.map(type =>
      getCelebs({ contentType: type, sortBy: 'content_count', limit: 10 })
    )
  )

  const entries: TopByTypeFullEntry[] = []
  results.forEach((result, i) => {
    const type = types[i]
    if (result.celebs.length > 0) {
      const sorted = [...result.celebs].sort((a, b) => (b.content_count ?? 0) - (a.content_count ?? 0))
      entries.push({
        type,
        label: CONTENT_TYPE_LABELS[type],
        celebs: sorted.map(c => ({ ...c, typeCount: c.content_count ?? 0 })),
      })
    }
  })

  return entries
}
