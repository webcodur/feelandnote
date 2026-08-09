import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '블라인드 게임',
}
import BlindGameClient from './BlindGameClient'

export default async function BlindGamePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const perPage = 30

  const supabase = await createClient()

  const { data: scoreRows, count, error: scoresError } = await supabase
    .from('blind_game_scores')
    .select(
      '*, account:user_accounts!blind_scores_accounts_fkey(id, member:member_profiles!member_profiles_id_fkey(id, nickname, avatar_url))',
      { count: 'exact' }
    )
    .order('score', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (scoresError) throw new Error(`Failed to load blind game scores: ${scoresError.message}`)

  const scores = (scoreRows ?? []).map((row) => {
    const account = Array.isArray(row.account) ? row.account[0] : row.account
    const member = Array.isArray(account?.member) ? account.member[0] : account?.member
    return { ...row, user: member ?? null }
  })

  const total = count || 0
  const totalPages = Math.ceil(total / perPage)

  // 통계
  const { data: stats, error: statsError } = await supabase.from('blind_game_scores').select('score, streak')
  if (statsError) throw new Error(`Failed to load blind game statistics: ${statsError.message}`)
  const maxScore = stats ? Math.max(...stats.map((s) => s.score), 0) : 0
  const maxStreak = stats ? Math.max(...stats.map((s) => s.streak), 0) : 0
  const avgScore = stats?.length ? Math.round(stats.reduce((sum, s) => sum + s.score, 0) / stats.length) : 0

  // 상위 플레이어
  const { data: topPlayersRaw, error: topPlayersError } = await supabase
    .from('blind_game_scores')
    .select(
      'user_id, score, account:user_accounts!blind_scores_accounts_fkey(id, member:member_profiles!member_profiles_id_fkey(id, nickname, avatar_url))'
    )
    .order('score', { ascending: false })
    .limit(3)

  if (topPlayersError) {
    throw new Error(`Failed to load top blind game players: ${topPlayersError.message}`)
  }

  const topPlayers = (topPlayersRaw || []).map((p) => {
    const account = Array.isArray(p.account) ? p.account[0] : p.account
    const member = Array.isArray(account?.member) ? account.member[0] : account?.member
    return { user_id: p.user_id, score: p.score, user: member ?? null }
  })

  return (
    <BlindGameClient
      scores={scores}
      total={total}
      page={page}
      totalPages={totalPages}
      stats={{ maxScore, maxStreak, avgScore }}
      topPlayers={topPlayers}
    />
  )
}
