'use server'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export interface UserStats {
  totalContents: number
  totalRecords: number
  totalReviews: number
}

// egress-allow: 본인 가변 데이터 — 캐시 부적합 (records는 viewer 의존 RLS, 카운트 head:true로 페이로드 최소. React.cache는 요청 내 dedup만 수행)
export const getStats = cache(getStatsInner)

async function getStatsInner(): Promise<UserStats> {
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
    // 리뷰 카운트: user_contents에서 rating 또는 review가 있는 항목
    supabase
      .from('user_contents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or('rating.not.is.null,review.not.is.null')
  ])

  return {
    totalContents: contentsResult.count || 0,
    totalRecords: recordsResult.count || 0,
    totalReviews: reviewsResult.count || 0
  }
}
