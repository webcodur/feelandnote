'use server'

import { createClient } from '@/lib/db/server'

export interface CelebViewStats {
  recentViews: number
  totalViews: number
  windowStart: string
  windowEnd: string
}

/**
 * 인물 한 명의 조회수 요약(최근 기간 + 누적 + 기간 경계).
 * 조회수 안내 모달을 열 때만 호출한다 — 화면을 열 때는 부르지 않는다.
 * 실패하면 조용히 넘기지 않고 null을 돌려주되 원인을 로그에 남긴다.
 */
export async function getCelebViewStats(
  celebId: string,
  days = 30,
): Promise<CelebViewStats | null> {
  const db = await createClient()

  const { data, error } = await db
    .rpc('get_celeb_view_stats', { p_celeb_id: celebId, p_days: days })

  if (error) {
    console.error('[인물 조회수] 요약 조회 실패:', error.message)
    return null
  }

  const row = data?.[0]
  if (!row) return null

  return {
    recentViews: row.recent_views ?? 0,
    totalViews: row.view_count ?? 0,
    windowStart: row.window_start,
    windowEnd: row.window_end,
  }
}
