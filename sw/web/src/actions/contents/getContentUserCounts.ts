'use server'

import { unstable_cache } from 'next/cache'
import { throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'

// 여러 콘텐츠 ID에 대한 user_count를 조회한다.
// 외부 API 검색 결과에 DB의 user_count를 매핑하기 위해 사용.
// 캐시 inner: 정렬된 id 목록 문자열만 받아 캐시 키를 안정화한다
async function fetchContentUserCounts(idsKey: string): Promise<Record<string, number>> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('contents')
    .select('id, user_count')
    .in('id', idsKey.split(','))

  throwOnQueryError('user_count 조회', error)

  const result: Record<string, number> = {}
  for (const item of data || []) {
    if (item.user_count && item.user_count > 0) {
      result[item.id] = item.user_count
    }
  }

  return result
}

const getCachedContentUserCounts = unstable_cache(
  fetchContentUserCounts,
  ['content-user-counts'],
  { revalidate: 3600, tags: [CACHE_TAGS.CONTENTS] }
)

export async function getContentUserCounts(contentIds: string[]): Promise<Record<string, number>> {
  if (contentIds.length === 0) return {}
  return withQueryFallback(
    'getContentUserCounts',
    () => getCachedContentUserCounts([...contentIds].sort().join(',')),
    {},
  )
}
