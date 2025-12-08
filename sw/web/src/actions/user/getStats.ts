'use server'

import { createClient } from '@/lib/supabase/server'

export interface UserStats {
  totalContents: number
  totalRecords: number
  totalReviews: number
}

export async function getStats(): Promise<UserStats> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { totalContents: 0, totalRecords: 0, totalReviews: 0 }
  }

  // 병렬로 통계 조회
  const [contentsResult, recordsResult, reviewsResult] = await Promise.all([
    supabase
      .from('user_contents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'REVIEW')
  ])

  return {
    totalContents: contentsResult.count || 0,
    totalRecords: recordsResult.count || 0,
    totalReviews: reviewsResult.count || 0
  }
}
