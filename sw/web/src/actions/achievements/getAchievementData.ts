'use server'

import { createClient } from '@/lib/supabase/server'

export interface Title {
  id: string
  name: string
  description: string
  category: 'volume' | 'diversity' | 'consistency' | 'depth' | 'social' | 'special'
  grade: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  bonus_score: number
  condition: {
    type: string
    value: number
  }
  sort_order: number
  icon_type?: 'lucide' | 'svg' | 'emoji'
  icon_svg?: string
  unlocked?: boolean
  unlocked_at?: string
}

export interface ScoreLog {
  id: string
  type: 'activity' | 'title'
  action: string
  amount: number
  created_at: string
}

export interface UserScore {
  activity_score: number
  title_bonus: number
  total_score: number
}

export interface AchievementData {
  titles: Title[]
  scoreLogs: ScoreLog[]
  userScore: UserScore
  stats: {
    contentCount: number
    recordCount: number
    categoryCount: number
    creatorCount: number
    completedCount: number
  }
}

export async function getAchievementData(): Promise<AchievementData | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  // 병렬로 모든 데이터 조회
  const [
    titlesResult,
    userTitlesResult,
    scoreLogsResult,
    userScoreResult,
    contentCountResult,
    recordCountResult,
    categoryResult,
    creatorResult,
    completedResult
  ] = await Promise.all([
    // 전체 칭호 목록
    supabase
      .from('titles')
      .select('*')
      .order('category')
      .order('sort_order'),

    // 사용자가 획득한 칭호
    supabase
      .from('user_titles')
      .select('title_id, unlocked_at')
      .eq('user_id', user.id),

    // 점수 내역 (최근 20개)
    supabase
      .from('score_logs')
      .select('id, type, action, amount, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),

    // 사용자 점수
    supabase
      .from('user_scores')
      .select('activity_score, title_bonus, total_score')
      .eq('user_id', user.id)
      .single(),

    // 콘텐츠 수
    supabase
      .from('user_contents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),

    // 기록 수
    supabase
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),

    // 카테고리 다양성 (콘텐츠 타입 수)
    supabase
      .from('user_contents')
      .select('content_id, contents!inner(type)')
      .eq('user_id', user.id),

    // 창작자 다양성
    supabase
      .from('user_contents')
      .select('content_id, contents!inner(creator)')
      .eq('user_id', user.id),

    // 완료한 콘텐츠 수 (status가 완료 계열)
    supabase
      .from('user_contents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['FINISHED', 'RECOMMENDED', 'NOT_RECOMMENDED'])
  ])

  // 획득한 칭호 ID Set
  const unlockedTitleIds = new Set(
    userTitlesResult.data?.map(ut => ut.title_id) || []
  )
  const unlockedMap = new Map(
    userTitlesResult.data?.map(ut => [ut.title_id, ut.unlocked_at]) || []
  )

  // 칭호에 획득 정보 추가
  const titles: Title[] = (titlesResult.data || []).map(title => ({
    ...title,
    unlocked: unlockedTitleIds.has(title.id),
    unlocked_at: unlockedMap.get(title.id)
  }))

  // 카테고리 수 계산
  const categoryTypes = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (categoryResult.data || []).map((item: any) => item.contents?.type).filter(Boolean)
  )

  // 창작자 수 계산
  const creators = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (creatorResult.data || []).map((item: any) => item.contents?.creator).filter(Boolean)
  )

  return {
    titles,
    scoreLogs: scoreLogsResult.data || [],
    userScore: userScoreResult.data || { activity_score: 0, title_bonus: 0, total_score: 0 },
    stats: {
      contentCount: contentCountResult.count || 0,
      recordCount: recordCountResult.count || 0,
      categoryCount: categoryTypes.size,
      creatorCount: creators.size,
      completedCount: completedResult.count || 0
    }
  }
}
