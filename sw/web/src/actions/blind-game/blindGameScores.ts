'use server'

import { createClient } from '@/lib/supabase/server'

export interface BlindGameScoreWithProfile {
  id: string
  user_id: string
  score: number
  max_streak: number
  played_at: string
  profile: {
    nickname: string | null
    avatar_url: string | null
  } | null
}

interface SaveScoreParams {
  score: number
  maxStreak: number
}

// 점수 저장
export async function saveBlindGameScore(params: SaveScoreParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { score, maxStreak } = params

  const { data, error } = await supabase
    .from('blind_game_scores')
    .insert({
      user_id: user.id,
      score,
      max_streak: maxStreak,
    })
    .select()
    .single()

  if (error) {
    console.error('Save blind game score error:', error)
    throw new Error('점수 저장에 실패했습니다')
  }

  return data
}

// 내 점수 기록 조회
export async function getBlindGameScores(limit = 10): Promise<BlindGameScoreWithProfile[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { data, error } = await supabase
    .from('blind_game_scores')
    .select(`
      *,
      profile:profiles(nickname, avatar_url)
    `)
    .eq('user_id', user.id)
    .order('score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Get blind game scores error:', error)
    throw new Error('점수 조회에 실패했습니다')
  }

  return data || []
}

// 내 최고 점수
export async function getMyBestScore(): Promise<BlindGameScoreWithProfile | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('blind_game_scores')
    .select(`
      *,
      profile:profiles(nickname, avatar_url)
    `)
    .eq('user_id', user.id)
    .order('score', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Get best score error:', error)
    return null
  }

  return data
}

// 전체 리더보드
export async function getLeaderboard(limit = 20): Promise<BlindGameScoreWithProfile[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('blind_game_scores')
    .select(`
      *,
      profile:profiles(nickname, avatar_url)
    `)
    .order('score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Get leaderboard error:', error)
    throw new Error('리더보드 조회에 실패했습니다')
  }

  return data || []
}
