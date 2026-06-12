'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'

export interface ContentCounts {
  celebCount: number
  userCount: number
}

// 콘텐츠별 셀럽/일반인 감상 수 배치 조회 (RPC 단일 호출)
// 캐시 inner: 정렬된 id 목록 문자열만 받아 캐시 키를 안정화한다
async function fetchCelebCounts(idsKey: string): Promise<Record<string, ContentCounts>> {
  const supabase = createStaticClient()

  const { data, error } = await supabase.rpc('get_content_celeb_user_counts', {
    p_content_ids: idsKey.split(','),
  })

  if (error || !data) return {}

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
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getCelebCountsForContents(
  contentIds: string[]
): Promise<Record<string, ContentCounts>> {
  if (!contentIds.length) return {}
  return getCachedCelebCounts([...contentIds].sort().join(','))
}
