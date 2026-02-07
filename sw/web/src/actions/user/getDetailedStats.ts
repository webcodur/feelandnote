'use server'

import { createClient } from '@/lib/supabase/server'
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
  CERTIFICATE: '#06b6d4',
}
// #endregion

export async function getDetailedStats(targetUserId?: string): Promise<DetailedStats> {
  const supabase = await createClient()

  const uid = targetUserId ?? (await supabase.auth.getUser()).data.user?.id
  if (!uid) return getEmptyStats()

  // 2개 쿼리로 모든 데이터 확보
  const [ucResult, recordsResult] = await Promise.all([
    supabase
      .from('user_contents')
      .select('status, rating, created_at, contents(type)')
      .eq('user_id', uid),
    supabase
      .from('records')
      .select('type')
      .eq('user_id', uid),
  ])

  const rows = ucResult.data ?? []
  const records = recordsResult.data ?? []

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
    const contents = row.contents as unknown as { type: string } | null
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
      totalRecords: records.length,
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
