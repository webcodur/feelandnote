'use server'

import { unstable_cache } from 'next/cache'
import { throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'

export interface ContentCounts {
  celebCount: number
  userCount: number
}

// 콘텐츠별 셀럽/회원 감상 수 배치 조회.
// 파생 개수의 원천은 contents의 도메인별 count 열이다.
// 캐시 inner: 정렬된 id 목록 문자열만 받아 캐시 키를 안정화한다
async function fetchCelebCounts(idsKey: string): Promise<Record<string, ContentCounts>> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('contents')
    .select('content_id:id, celeb_count, user_count:member_count')
    .in('id', idsKey.split(','))

  throwOnQueryError('getCelebCountsForContents', error)
  if (!data) return {}

  const counts: Record<string, ContentCounts> = {}
  for (const row of data as { content_id: string; celeb_count: number; user_count: number }[]) {
    counts[row.content_id] = {
      celebCount: row.celeb_count,
      userCount: row.user_count,
    }
  }
  return counts
}

const getCachedCelebCounts = unstable_cache(
  fetchCelebCounts,
  ['content-celeb-counts'],
  // contents의 member_count·celeb_count를 읽는다.
  { revalidate: 3600, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getCelebCountsForContents(
  contentIds: string[]
): Promise<Record<string, ContentCounts>> {
  if (!contentIds.length) return {}
  return withQueryFallback(
    'getCelebCountsForContents',
    () => getCachedCelebCounts([...contentIds].sort().join(',')),
    {},
  )
}
