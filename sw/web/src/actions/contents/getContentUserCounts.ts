'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * 여러 콘텐츠 ID에 대한 user_count를 조회한다.
 * 외부 API 검색 결과에 DB의 user_count를 매핑하기 위해 사용.
 */
export async function getContentUserCounts(contentIds: string[]): Promise<Record<string, number>> {
  if (contentIds.length === 0) return {}

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contents')
    .select('id, user_count')
    .in('id', contentIds)

  if (error) {
    console.error('user_count 조회 에러:', error)
    return {}
  }

  const result: Record<string, number> = {}
  for (const item of data || []) {
    if (item.user_count && item.user_count > 0) {
      result[item.id] = item.user_count
    }
  }

  return result
}
