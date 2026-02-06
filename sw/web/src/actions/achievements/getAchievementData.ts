'use server'

import { createClient } from '@/lib/supabase/server'
import { TITLES, type TitleDefinition } from '@/constants/titles'

export interface TitleWithStatus extends TitleDefinition {
  unlocked: boolean
}

export interface ScoreLog {
  id: string
  type: 'activity' | 'title'
  action: string
  amount: number
  created_at: string
}

export interface UserScore {
  activity_score: number
  title_bonus: number
  total_score: number
}

export interface AchievementData {
  titles: TitleWithStatus[]
  scoreLogs: ScoreLog[]
  userScore: UserScore
  stats: Record<string, number>
}

export async function getAchievementData(targetUserId?: string): Promise<AchievementData | null> {
  const supabase = await createClient()

  // targetUserId가 없으면 로그인 유저 기준
  let userId = targetUserId
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    userId = user.id
  }

  // 병렬로 데이터 조회
  const [stats, scoreLogsResult, userScoreResult] = await Promise.all([
    getUserStats(supabase, userId),
    supabase
      .from('score_logs')
      .select('id, type, action, amount, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('user_scores')
      .select('activity_score, title_bonus, total_score')
      .eq('user_id', userId)
      .single(),
  ])

  // 실시간으로 칭호 해금 여부 계산
  const titles: TitleWithStatus[] = TITLES.map(title => ({
    ...title,
    unlocked: checkCondition(title.condition, stats),
  }))

  return {
    titles,
    scoreLogs: scoreLogsResult.data || [],
    userScore: userScoreResult.data || { activity_score: 0, title_bonus: 0, total_score: 0 },
    stats,
  }
}

// 사용자 통계 조회 (export하여 selectTitle에서도 사용)
export async function getUserStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<Record<string, number>> {
  const [
    contentCountResult,
    recordCountResult,
    categoryResult,
    creatorResult,
    completedResult,
    reviewLengthResult
  ] = await Promise.all([
    supabase
      .from('user_contents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('user_contents')
      .select('content_id, contents!inner(type)')
      .eq('user_id', userId),
    supabase
      .from('user_contents')
      .select('content_id, contents!inner(creator)')
      .eq('user_id', userId),
    supabase
      .from('user_contents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['FINISHED', 'RECOMMENDED', 'NOT_RECOMMENDED']),
    supabase
      .from('user_contents')
      .select('review')
      .eq('user_id', userId)
      .not('review', 'is', null)
  ])

  // 카테고리 수
  const categoryTypes = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (categoryResult.data || []).map((item: any) => item.contents?.type).filter(Boolean)
  )

  // 창작자 수
  const creators = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (creatorResult.data || []).map((item: any) => item.contents?.creator).filter(Boolean)
  )

  // 리뷰 통계
  const reviews = reviewLengthResult.data || []
  const avgReviewLength = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.review?.length || 0), 0) / reviews.length
    : 0
  const longReviewCount = reviews.filter(r => (r.review?.length || 0) >= 300).length

  return {
    content_count: contentCountResult.count || 0,
    record_count: recordCountResult.count || 0,
    category_count: categoryTypes.size,
    creator_count: creators.size,
    completed_count: completedResult.count || 0,
    avg_review_length: avgReviewLength,
    long_review_count: longReviewCount,
  }
}

// 조건 체크
function checkCondition(condition: { type: string; value: number }, stats: Record<string, number>): boolean {
  const statValue = stats[condition.type] || 0
  return statValue >= condition.value
}
