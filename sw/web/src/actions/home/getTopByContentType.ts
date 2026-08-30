'use server'

import { getCelebs } from './getCelebs'
import type { CelebProfile } from '@/types/home'

// 콘텐츠 타입별 라벨
const CONTENT_TYPE_LABELS: Record<string, { ko: string; en: string }> = {
  BOOK: { ko: '책', en: 'Book' },
  VIDEO: { ko: '영화/드라마', en: 'Film' },
  GAME: { ko: '게임', en: 'Game' },
  MUSIC: { ko: '음악', en: 'Music' },
}

export interface TopByTypeEntry {
  type: string
  label: { ko: string; en: string }
  /** 타입별 content_count 상위 3명 (1위부터) */
  celebs: CelebProfile[]
}

/**
 * BOOK, VIDEO, GAME, MUSIC 각 타입별 content_count 상위 3명 조회
 * RPC ORDER BY가 전체 count 기준이므로, 다수 조회 후 타입별 count(SELECT)로 재정렬
 */
export async function getTopByContentType(): Promise<TopByTypeEntry[]> {
  const types = ['BOOK', 'VIDEO', 'GAME', 'MUSIC']

  const results = await Promise.all(
    types.map(type =>
      getCelebs({
        contentType: type,
        sortBy: 'content_count',
        limit: 3,
        includeTotal: false,
        includeViewerState: false,
      })
    )
  )

  const entries: TopByTypeEntry[] = []
  results.forEach((result, i) => {
    const type = types[i]
    if (result.celebs.length > 0) {
      // content_count는 RPC SELECT에서 타입별로 정확하게 계산됨
      const sorted = [...result.celebs].sort((a, b) => (b.content_count ?? 0) - (a.content_count ?? 0))
      entries.push({
        type,
        label: CONTENT_TYPE_LABELS[type],
        celebs: sorted.slice(0, 3),
      })
    }
  })

  return entries
}
