'use server'

import { createClient } from '@/lib/supabase/server'
import type { Title } from './getAchievementData'

interface UnlockResult {
  unlocked: Title[]
  scoreAdded: number
}

/**
 * 업적 달성 조건을 체크하고 칭호를 해금
 * 콘텐츠 추가, 리뷰 작성 등의 액션 후 호출
 */
export async function checkAchievements(): Promise<UnlockResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { unlocked: [], scoreAdded: 0 }
  }

  // 1. 아직 획득하지 않은 칭호 조회
  const { data: allTitles } = await supabase
    .from('titles')
    .select('*')
    .not('category', 'eq', 'social') // 소셜 카테고리 제외 (개발예정)

  const { data: userTitles } = await supabase
    .from('user_titles')
    .select('title_id')
    .eq('user_id', user.id)

  const unlockedIds = new Set(userTitles?.map(ut => ut.title_id) || [])
  const pendingTitles = (allTitles || []).filter(t => !unlockedIds.has(t.id))

  if (pendingTitles.length === 0) {
    return { unlocked: [], scoreAdded: 0 }
  }

  // 2. 사용자 통계 조회
  const stats = await getUserStats(supabase, user.id)

  // 3. 각 칭호의 달성 조건 체크
  const newlyUnlocked: Title[] = []

  for (const title of pendingTitles) {
    const condition = title.condition as { type: string; value: number }
    if (checkCondition(condition, stats)) {
      newlyUnlocked.push(title)
    }
  }

  if (newlyUnlocked.length === 0) {
    return { unlocked: [], scoreAdded: 0 }
  }

  // 4. 칭호 해금 및 점수 추가
  const now = new Date().toISOString()
  let totalBonusScore = 0

  for (const title of newlyUnlocked) {
    // user_titles에 추가
    await supabase
      .from('user_titles')
      .insert({
        user_id: user.id,
        title_id: title.id,
        unlocked_at: now
      })

    // score_logs에 기록
    await supabase
      .from('score_logs')
      .insert({
        user_id: user.id,
        type: 'title',
        action: `칭호 해금: ${title.name}`,
        amount: title.bonus_score
      })

    totalBonusScore += title.bonus_score
  }

  // 5. user_scores 업데이트
  const { data: currentScore } = await supabase
    .from('user_scores')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (currentScore) {
    await supabase
      .from('user_scores')
      .update({
        title_bonus: currentScore.title_bonus + totalBonusScore,
        total_score: currentScore.total_score + totalBonusScore,
        updated_at: now
      })
      .eq('user_id', user.id)
  } else {
    await supabase
      .from('user_scores')
      .insert({
        user_id: user.id,
        activity_score: 0,
        title_bonus: totalBonusScore,
        total_score: totalBonusScore,
        updated_at: now
      })
  }

  return { unlocked: newlyUnlocked, scoreAdded: totalBonusScore }
}

/**
 * 활동 점수 추가 (콘텐츠 추가, 리뷰 작성 등)
 */
export async function addActivityScore(action: string, amount: number, referenceId?: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const now = new Date().toISOString()

  // score_logs에 기록
  await supabase
    .from('score_logs')
    .insert({
      user_id: user.id,
      type: 'activity',
      action,
      amount,
      reference_id: referenceId
    })

  // user_scores 업데이트
  const { data: currentScore } = await supabase
    .from('user_scores')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (currentScore) {
    await supabase
      .from('user_scores')
      .update({
        activity_score: currentScore.activity_score + amount,
        total_score: currentScore.total_score + amount,
        updated_at: now
      })
      .eq('user_id', user.id)
  } else {
    await supabase
      .from('user_scores')
      .insert({
        user_id: user.id,
        activity_score: amount,
        title_bonus: 0,
        total_score: amount,
        updated_at: now
      })
  }
}

// 사용자 통계 조회
async function getUserStats(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
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

    // 리뷰 길이: user_contents에서 review 컬럼
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

  // 평균 리뷰 길이
  const reviews = reviewLengthResult.data || []
  const avgReviewLength = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.review?.length || 0), 0) / reviews.length
    : 0

  // 긴 리뷰 수 (300자 이상)
  const longReviewCount = reviews.filter(r => (r.review?.length || 0) >= 300).length

  return {
    content_count: contentCountResult.count || 0,
    record_count: recordCountResult.count || 0,
    category_count: categoryTypes.size,
    creator_count: creators.size,
    completed_count: completedResult.count || 0,
    avg_review_length: avgReviewLength,
    long_review_count: longReviewCount
  }
}

// 조건 체크
function checkCondition(
  condition: { type: string; value: number },
  stats: Record<string, number>
): boolean {
  const { type, value } = condition

  switch (type) {
    case 'content_count':
      return stats.content_count >= value
    case 'record_count':
      return stats.record_count >= value
    case 'category_count':
      return stats.category_count >= value
    case 'creator_count':
      return stats.creator_count >= value
    case 'completed_count':
      return stats.completed_count >= value
    case 'avg_review_length':
      return stats.avg_review_length >= value
    case 'long_review_count':
      return stats.long_review_count >= value
    // 아래 조건들은 별도 구현 필요 (개발예정)
    case 'streak_days':
    case 'active_months':
    case 'night_activity_count':
    case 'morning_activity_count':
    case 'weekend_binge_count':
    case 'series_complete_count':
    case 'cross_media_count':
    case 'first_recorder_count':
    case 'trendsetter_score':
    case 'creative_review_count':
    case 'high_quality_private':
    case 'follower_count':
      return false // 미구현
    default:
      return false
  }
}
