'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createClient } from '@/lib/db/server'
import { createStaticClient } from '@/lib/db/static'
import { CATEGORIES } from '@/constants/categories'

// #region 타입 정의
export interface DetailedStats {
  summary: {
    totalFinished: number
    totalWant: number
    totalReviews: number
    totalRecords: number
  }
  categoryBreakdown: Array<{
    type: string
    label: string
    unit: string
    finished: number
    want: number
    color: string
  }>
  monthlyTrend: Array<{
    month: string
    count: number
  }>
  ratingStats: {
    average: number | null
    count: number
    distribution: number[]
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  BOOK: '#7c4dff',
  VIDEO: '#f59e0b',
  GAME: '#3fb950',
  MUSIC: '#ec4899',
}

interface UserContentStatRow {
  status: string
  rating: number | null
  created_at: string | null
  contents: { type: string } | { type: string }[] | null
}
type AnyDatabaseClient = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createStaticClient>
// #endregion

async function fetchUserContentsStats(
  db: AnyDatabaseClient,
  uid: string,
): Promise<UserContentStatRow[]> {
  const { data } = await db
    .from('member_contents')
    .select('status, rating, created_at, contents(type)')
    .eq('member_id', uid)

  return (data ?? []) as UserContentStatRow[]
}

async function fetchPublicUserContentsStats(uid: string): Promise<UserContentStatRow[]> {
  return fetchUserContentsStats(createStaticClient(), uid)
}

const getUserContentsStatsCached = unstable_cache(
  fetchPublicUserContentsStats,
  ['detailed-stats-contents'],
  { revalidate: 3600, tags: [CACHE_TAGS.CONTENTS] }
)

export async function getDetailedStats(targetUserId?: string): Promise<DetailedStats> {
  const db = await createClient()
  const currentUser = (await db.auth.getUser()).data.user
  const uid = targetUserId ?? currentUser?.id
  if (!uid) return getEmptyStats()

  const contentRowsPromise = currentUser?.id === uid
    ? fetchUserContentsStats(db, uid)
    : getUserContentsStatsCached(uid)

  // records와 회원 감상 기록 모두 visibility RLS에 따라 viewer 범위를 지킨다.
  const [rows, recordsResult] = await Promise.all([
    contentRowsPromise,
    db
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid),
  ])

  const totalRecords = recordsResult.count || 0

  // JS 집계
  let totalFinished = 0
  let totalWant = 0
  let totalReviews = 0
  const categoryMap: Record<string, { finished: number; want: number }> = {}
  const monthMap: Record<string, number> = {}
  const ratingDist = [0, 0, 0, 0, 0] // index 0~4 → 1~5점
  let ratingSum = 0
  let ratingCount = 0

  for (const row of rows) {
    const contents = (Array.isArray(row.contents) ? row.contents[0] : row.contents) as { type: string } | null
    const type = contents?.type
    if (!type) continue

    // 카테고리+상태
    if (!categoryMap[type]) categoryMap[type] = { finished: 0, want: 0 }
    if (row.status === 'FINISHED') {
      totalFinished++
      categoryMap[type].finished++
    } else if (row.status === 'WANT') {
      totalWant++
      categoryMap[type].want++
    }

    // 리뷰
    if (row.rating != null) totalReviews++

    // 평점 분포
    if (row.rating != null && row.rating >= 1 && row.rating <= 5) {
      ratingDist[row.rating - 1]++
      ratingSum += row.rating
      ratingCount++
    }

    // 월별 추이 (최근 6개월)
    if (row.created_at) {
      const d = new Date(row.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap[key] = (monthMap[key] ?? 0) + 1
    }
  }

  // 카테고리별 현황 (CATEGORIES 순서 유지, total 내림차순)
  const categoryBreakdown = CATEGORIES
    .map(cat => ({
      type: cat.dbType,
      label: cat.label,
      unit: cat.unit,
      finished: categoryMap[cat.dbType]?.finished ?? 0,
      want: categoryMap[cat.dbType]?.want ?? 0,
      color: CATEGORY_COLORS[cat.dbType] ?? '#666',
    }))
    .filter(c => c.finished + c.want > 0)
    .sort((a, b) => (b.finished + b.want) - (a.finished + a.want))

  // 월별 추이 (최근 6개월, 빈 달 포함)
  const monthlyTrend = buildMonthlyTrend(monthMap, 6)

  return {
    summary: {
      totalFinished,
      totalWant,
      totalReviews,
      totalRecords,
    },
    categoryBreakdown,
    monthlyTrend,
    ratingStats: {
      average: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
      count: ratingCount,
      distribution: ratingDist,
    },
  }
}

// #region 헬퍼
function buildMonthlyTrend(monthMap: Record<string, number>, months: number) {
  const result: Array<{ month: string; count: number }> = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getMonth() + 1}월`
    result.push({ month: label, count: monthMap[key] ?? 0 })
  }

  return result
}

function getEmptyStats(): DetailedStats {
  return {
    summary: { totalFinished: 0, totalWant: 0, totalReviews: 0, totalRecords: 0 },
    categoryBreakdown: [],
    monthlyTrend: buildMonthlyTrend({}, 6),
    ratingStats: { average: null, count: 0, distribution: [0, 0, 0, 0, 0] },
  }
}
// #endregion
