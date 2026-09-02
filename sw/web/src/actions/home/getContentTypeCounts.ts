'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/db/static'
import { STATIC_REVALIDATE } from '@/lib/cache'

export type ContentTypeCounts = Record<string, number>

const DEFAULT_COUNTS: ContentTypeCounts = {
  all: 0,
  BOOK: 0,
  VIDEO: 0,
  GAME: 0,
  MUSIC: 0,
}

async function fetchContentTypeCounts(): Promise<ContentTypeCounts> {
  const db = createStaticClient()

  // PostgREST RPC(Remote Procedure Call): 웹에서 여러 테이블을 직접 조합하지 않고,
  // PostgreSQL에 저장된 함수 get_celeb_feed_type_counts()를 원격 호출해 타입별 집계를 한 번에 받는다.
  const { data, error } = await db.rpc('get_celeb_feed_type_counts')

  if (error || !data) {
    throw new Error(`getContentTypeCounts RPC failed: ${error?.message ?? 'empty response'}`)
  }

  return data as ContentTypeCounts
}

const getCachedContentTypeCounts = unstable_cache(
  fetchContentTypeCounts,
  ['content-type-counts-v2'],
  // get_celeb_feed_type_counts: 셀럽(celebs) 서고(celeb_contents)의 타입별 집계
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

/** RPC 실패값은 캐시에 넣지 않는다. 다음 요청에서 즉시 다시 시도할 수 있어야 한다. */
export async function getContentTypeCounts(): Promise<ContentTypeCounts> {
  try {
    return await getCachedContentTypeCounts()
  } catch (error) {
    console.error('getContentTypeCounts error:', error)
    return DEFAULT_COUNTS
  }
}
