import { createClient } from '@/lib/supabase/server'
import ScoresClient from './ScoresClient'

export default async function ScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const tab = params.tab || 'ranking'
  const perPage = 50

  const supabase = await createClient()

  // 랭킹 조회
  const { data: rankings, count: rankingCount } = await supabase
    .from('user_scores')
    .select('*, user:user_id (id, nickname, avatar_url, profile_type)', { count: 'exact' })
    .order('total_score', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  // 최근 점수 로그
  const { data: recentLogs, count: logCount } = await supabase
    .from('score_logs')
    .select('*, user:user_id (id, nickname, avatar_url)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  const total = tab === 'ranking' ? (rankingCount || 0) : (logCount || 0)
  const totalPages = Math.ceil(total / perPage)

  // 통계
  const { data: statsData } = await supabase.from('user_scores').select('total_score')
  const totalScoreSum = statsData ? statsData.reduce((sum, s) => sum + s.total_score, 0) : 0
  const avgScore = statsData?.length ? Math.round(totalScoreSum / statsData.length) : 0
  const maxScore = statsData ? Math.max(...statsData.map((s) => s.total_score), 0) : 0

  const tabOptions = [
    { value: 'ranking', label: '랭킹', count: rankingCount || 0 },
    { value: 'logs', label: '점수 로그', count: logCount || 0 },
  ]

  return (
    <ScoresClient
      rankings={rankings || []}
      recentLogs={recentLogs || []}
      tab={tab}
      page={page}
      totalPages={totalPages}
      stats={{ maxScore, avgScore, totalScore: totalScoreSum }}
      tabOptions={tabOptions}
    />
  )
}
