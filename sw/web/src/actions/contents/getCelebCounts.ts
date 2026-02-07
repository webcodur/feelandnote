'use server'

import { createClient } from '@/lib/supabase/server'

export interface ContentCounts {
  celebCount: number
  userCount: number
}

// 콘텐츠별 셀럽/일반인 감상 수 배치 조회 (RPC 단일 호출)
export async function getCelebCountsForContents(
  contentIds: string[]
): Promise<Record<string, ContentCounts>> {
  if (!contentIds.length) return {}

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_content_celeb_user_counts', {
    p_content_ids: contentIds,
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
