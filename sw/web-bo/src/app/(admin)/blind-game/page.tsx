import { createClient } from '@/lib/supabase/server'
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

  const { data: scores, count } = await supabase
    .from('blind_game_scores')
    .select('*, user:user_id (id, nickname, avatar_url)', { count: 'exact' })
    .order('score', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  const total = count || 0
  const totalPages = Math.ceil(total / perPage)

  // 통계
  const { data: stats } = await supabase.from('blind_game_scores').select('score, streak')
  const maxScore = stats ? Math.max(...stats.map((s) => s.score), 0) : 0
  const maxStreak = stats ? Math.max(...stats.map((s) => s.streak), 0) : 0
  const avgScore = stats?.length ? Math.round(stats.reduce((sum, s) => sum + s.score, 0) / stats.length) : 0

  // 상위 플레이어
  const { data: topPlayersRaw } = await supabase
    .from('blind_game_scores')
    .select('user_id, score, user:user_id (id, nickname, avatar_url)')
    .order('score', { ascending: false })
    .limit(3)

  const topPlayers = (topPlayersRaw || []).map((p) => ({
    user_id: p.user_id,
    score: p.score,
    user: Array.isArray(p.user) ? p.user[0] : p.user,
  }))

  return (
    <BlindGameClient
      scores={scores || []}
      total={total}
      page={page}
      totalPages={totalPages}
      stats={{ maxScore, maxStreak, avgScore }}
      topPlayers={topPlayers}
    />
  )
}
