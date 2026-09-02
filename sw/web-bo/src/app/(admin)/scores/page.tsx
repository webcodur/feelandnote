import type { Metadata } from 'next'
import { createClient } from '@/lib/db/server'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'

export const metadata: Metadata = {
  title: '점수 관리',
}
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

  const db = await createClient()

  // 랭킹 조회
  const { data: rankingRows, count: rankingCount, error: rankingsError } = await db
    .from('member_scores')
    .select(
      '*, account:user_accounts!member_scores_member_id_fkey(id, member:member_profiles!member_profiles_id_fkey(id, nickname, avatar_url))',
      { count: 'exact' }
    )
    .order('total_score', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (rankingsError) throw new Error(`Failed to load member scores: ${rankingsError.message}`)

  const rankings = (rankingRows ?? []).map((row) => {
    const account = Array.isArray(row.account) ? row.account[0] : row.account
    const member = Array.isArray(account?.member) ? account.member[0] : account?.member
    return { ...row, user: member ?? null }
  })

  // 최근 점수 로그
  const { data: recentLogRows, count: logCount, error: recentLogsError } = await db
    .from('member_score_logs')
    .select(
      '*, account:user_accounts!member_score_logs_member_id_fkey(id, member:member_profiles!member_profiles_id_fkey(id, nickname, avatar_url))',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (recentLogsError) {
    throw new Error(`Failed to load member score logs: ${recentLogsError.message}`)
  }

  const recentLogs = (recentLogRows ?? []).map((row) => {
    const account = Array.isArray(row.account) ? row.account[0] : row.account
    const member = Array.isArray(account?.member) ? account.member[0] : account?.member
    return { ...row, user: member ?? null }
  })

  const total = tab === 'ranking' ? (rankingCount || 0) : (logCount || 0)
  const totalPages = Math.ceil(total / perPage)

  // 통계: 합계·평균·최대는 전체 사용자를 대상으로 해야 한다. 정렬·페이징 없이 조회하면
  // 1,000행에서 잘려 임의의 일부만 집계되고, 볼 때마다 값이 달라진다. 고유키(member_id)로
  // 정렬해 전량을 받아 결정적으로 집계한다.
  const statsData = await selectAllPages<{ total_score: number | null }>((from, to) =>
    db.from('member_scores').select('total_score').order('member_id').range(from, to)
  )
  const totalScoreSum = statsData.reduce((sum, s) => sum + (s.total_score ?? 0), 0)
  const avgScore = statsData.length ? Math.round(totalScoreSum / statsData.length) : 0
  const maxScore = statsData.length ? Math.max(...statsData.map((s) => s.total_score ?? 0), 0) : 0

  const tabOptions = [
    { value: 'ranking', label: '랭킹', count: rankingCount || 0 },
    { value: 'logs', label: '점수 로그', count: logCount || 0 },
  ]

  return (
    <ScoresClient
      rankings={rankings}
      recentLogs={recentLogs}
      tab={tab}
      page={page}
      totalPages={totalPages}
      stats={{ maxScore, avgScore, totalScore: totalScoreSum }}
      tabOptions={tabOptions}
    />
  )
}
