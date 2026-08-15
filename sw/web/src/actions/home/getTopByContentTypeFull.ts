'use server'

import { getCelebs } from './getCelebs'
import { cachedList } from '@/lib/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import type { CelebProfile } from '@/types/home'
// 'use server' 파일은 함수만 내보낼 수 있어 매체 목록 상수는 화면 쪽에 둔다
import type { ContentTypeKey } from '@/app/[locale]/(main)/explore/ranking/constants'

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

async function fetchTopByContentType(type: ContentTypeKey): Promise<TopByTypeFullEntry | null> {
  const result = await getCelebs({ contentType: type, sortBy: 'content_count', limit: 10 })
  if (result.celebs.length === 0) return null

  const sorted = [...result.celebs].sort((a, b) => (b.content_count ?? 0) - (a.content_count ?? 0))
  return {
    type,
    label: CONTENT_TYPE_LABELS[type],
    celebs: sorted.map(c => ({ ...c, typeCount: c.content_count ?? 0 })),
  }
}

/**
 * 매체 하나의 Top 10 인물. 매체별로 독립된 레인이 각자 이 함수를 부른다.
 * getCelebs(getCelebsCached)와 같은 도메인(celebs·contents·dialogues·tags)을 읽으므로 같은 태그 조합을 쓴다.
 */
export async function getTopByContentTypeFull(type: ContentTypeKey): Promise<TopByTypeFullEntry | null> {
  return cachedList(
    CACHE_TAGS.CELEBS,
    ['top-by-content-type-full', type],
    () => fetchTopByContentType(type),
    { extraTags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES, CACHE_TAGS.TAGS] },
  )
}
