'use server'

import { createClient } from '@/lib/supabase/server'

export interface DetailedStats {
  summary: {
    totalContents: number
    totalReviews: number
    totalNotes: number
    totalQuotes: number
  }
  categoryDistribution: Array<{
    name: string
    value: number
    color: string
  }>
  recentActivities: Array<{
    id: string
    type: string
    title: string
    time: string
  }>
  monthlyTrend: Array<{
    month: string
    contents: number
    reviews: number
    notes: number
  }>
}

export async function getDetailedStats(): Promise<DetailedStats> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return getEmptyStats()
  }

  // 병렬로 통계 조회
  const [
    contentsResult,
    reviewsResult,
    notesResult,
    quotesResult,
    bookCountResult,
    movieCountResult,
    recentRecordsResult
  ] = await Promise.all([
    supabase
      .from('user_contents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    // 리뷰 카운트: user_contents에서 rating 또는 review가 있는 항목
    supabase
      .from('user_contents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or('rating.not.is.null,review.not.is.null'),
    supabase
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'NOTE'),
    supabase
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'QUOTE'),
    supabase
      .from('user_contents')
      .select('id, content:contents!inner(type)', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('contents.type', 'BOOK'),
    supabase
      .from('user_contents')
      .select('id, content:contents!inner(type)', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('contents.type', 'MOVIE'),
    // 최근 활동: records에서 NOTE, QUOTE만
    supabase
      .from('records')
      .select(`
        id,
        type,
        created_at,
        contentData:contents(title)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
  ])

  // 최근 활동 포맷팅
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentActivities = (recentRecordsResult.data || []).map((record: any) => ({
    id: record.id,
    type: record.type,
    title: record.contentData?.title || '알 수 없음',
    time: getRelativeTime(record.created_at)
  }))

  // 월별 트렌드 (간단히 현재 달만)
  const currentMonth = new Date().toLocaleString('ko-KR', { month: 'long' })
  const monthlyTrend = [
    {
      month: currentMonth,
      contents: contentsResult.count || 0,
      reviews: reviewsResult.count || 0,
      notes: notesResult.count || 0
    }
  ]

  return {
    summary: {
      totalContents: contentsResult.count || 0,
      totalReviews: reviewsResult.count || 0,
      totalNotes: notesResult.count || 0,
      totalQuotes: quotesResult.count || 0
    },
    categoryDistribution: [
      { name: '도서', value: bookCountResult.count || 0, color: '#7c4dff' },
      { name: '영화', value: movieCountResult.count || 0, color: '#f59e0b' }
    ],
    recentActivities,
    monthlyTrend
  }
}

function getEmptyStats(): DetailedStats {
  return {
    summary: {
      totalContents: 0,
      totalReviews: 0,
      totalNotes: 0,
      totalQuotes: 0
    },
    categoryDistribution: [],
    recentActivities: [],
    monthlyTrend: []
  }
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`
  return date.toLocaleDateString('ko-KR')
}
