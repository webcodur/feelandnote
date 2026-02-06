'use server'

import { createClient } from '@/lib/supabase/server'

export interface ContentCounts {
  celebCount: number
  userCount: number
}

// 콘텐츠별 셀럽/일반인 감상 수 배치 조회
export async function getCelebCountsForContents(
  contentIds: string[]
): Promise<Record<string, ContentCounts>> {
  if (!contentIds.length) return {}

  const supabase = await createClient()

  // 1. 해당 콘텐츠의 FINISHED 상태 user_contents 조회
  const { data: ucData } = await supabase
    .from('user_contents')
    .select('content_id, user_id')
    .in('content_id', contentIds)
    .eq('status', 'FINISHED')

  if (!ucData?.length) return {}

  // 2. 고유 user_id 중 CELEB 프로필 식별
  const uniqueUserIds = [...new Set(ucData.map(r => r.user_id))]
  const celebIdSet = new Set<string>()

  for (let i = 0; i < uniqueUserIds.length; i += 50) {
    const batch = uniqueUserIds.slice(i, i + 50)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .in('id', batch)
      .eq('profile_type', 'CELEB')
      .eq('status', 'active')

    if (profiles) profiles.forEach(p => celebIdSet.add(p.id))
  }

  // 3. content_id별 셀럽/일반인 수 집계
  const counts: Record<string, ContentCounts> = {}
  for (const item of ucData) {
    if (!counts[item.content_id]) {
      counts[item.content_id] = { celebCount: 0, userCount: 0 }
    }
    if (celebIdSet.has(item.user_id)) {
      counts[item.content_id].celebCount++
    } else {
      counts[item.content_id].userCount++
    }
  }

  return counts
}
