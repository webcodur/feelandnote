'use server'

import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/db/server'
import { createStaticClient } from '@/lib/db/static'
import { TITLES, type TitleDefinition } from '@/constants/titles'

export interface TitleWithStatus extends TitleDefinition {
  unlocked: boolean
}

interface ScoreLog {
  id: string
  type: 'activity' | 'title'
  action: string
  amount: number
  created_at: string
}

interface UserScore {
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

type AnyDatabaseClient = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createStaticClient>

// contents!inner(type) 조인 행
interface CategoryJoinRow {
  content_id: string
  contents: { type: string } | null
}

// contents!inner(content_locales(locale, creator)) 조인 행
interface CreatorJoinRow {
  content_id: string
  contents: {
    content_locales: { locale: string; creator: string | null }[] | null
  } | null
}

async function fetchAchievementData(
  db: AnyDatabaseClient,
  userId: string,
  includePrivateLogs: boolean
): Promise<AchievementData> {
  const scoreLogsPromise = includePrivateLogs
    ? db
        .from('member_score_logs')
        .select('id, type, action, amount, created_at')
        .eq('member_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
    : Promise.resolve({ data: [] as ScoreLog[] })

  const [stats, scoreLogsResult, userScoreResult] = await Promise.all([
    getUserStats(db, userId),
    scoreLogsPromise,
    db
      .from('member_scores')
      .select('activity_score, title_bonus, total_score')
      .eq('member_id', userId)
      .single(),
  ])

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

async function fetchPublicAchievementData(userId: string): Promise<AchievementData> {
  return fetchAchievementData(createStaticClient(), userId, false)
}

const fetchAchievementDataCached = unstable_cache(
  fetchPublicAchievementData,
  ['achievement-data'],
  // 특정 회원의 활동 점수·칭호와 본인 서고 집계만 읽는다.
  // BO에 이 데이터를 수정하는 액션이 없어 무효화 태그를 두지 않는다 — 시간 만료로만 갱신한다.
  { revalidate: 3600 }
)

export async function getAchievementData(targetUserId?: string): Promise<AchievementData | null> {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  const userId = targetUserId ?? user?.id

  if (!userId) {
    return null
  }

  if (user?.id === userId) {
    return fetchAchievementData(db, userId, true)
  }

  return fetchAchievementDataCached(userId)
}

// 사용자 통계 조회 (selectTitle 등에서도 사용)
export async function getUserStats(
  db: AnyDatabaseClient,
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
    db
      .from('member_contents')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', userId),
    db
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    db
      .from('member_contents')
      .select('content_id, contents!inner(type)')
      .eq('member_id', userId),
    db
      .from('member_contents')
      .select('content_id, contents!inner(content_locales(locale, creator))')
      .eq('member_id', userId),
    db
      .from('member_contents')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', userId)
      .in('status', ['FINISHED', 'RECOMMENDED', 'NOT_RECOMMENDED']),
    db
      .from('member_contents')
      .select('review')
      .eq('member_id', userId)
      .not('review', 'is', null)
  ])

  // 미타입 클라이언트가 다대일 조인을 배열로 잘못 추론하므로 실제 런타임 형태로 교정
  const categoryRows = (categoryResult.data || []) as unknown as CategoryJoinRow[]
  const creatorRows = (creatorResult.data || []) as unknown as CreatorJoinRow[]

  const categoryTypes = new Set(
    categoryRows.map(item => item.contents?.type).filter(Boolean)
  )

  const creators = new Set(
    creatorRows.map(item => {
      const locales = item.contents?.content_locales || []
      const ko = locales.find(l => l.locale === 'ko')
      const en = locales.find(l => l.locale === 'en')
      return ko?.creator || en?.creator
    }).filter(Boolean)
  )

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

function checkCondition(condition: { type: string; value: number }, stats: Record<string, number>): boolean {
  const statValue = stats[condition.type] || 0
  return statValue >= condition.value
}
