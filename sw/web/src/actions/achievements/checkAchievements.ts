'use server'

import { createClient } from '@/lib/supabase/server'

// 활동 점수 추가 (콘텐츠 추가, 리뷰 작성 등)
export async function addActivityScore(action: string, amount: number, referenceId?: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const now = new Date().toISOString()

  // score_logs에 기록
  await supabase
    .from('score_logs')
    .insert({
      user_id: user.id,
      type: 'activity',
      action,
      amount,
      reference_id: referenceId
    })

  // user_scores 업데이트
  const { data: currentScore } = await supabase
    .from('user_scores')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (currentScore) {
    await supabase
      .from('user_scores')
      .update({
        activity_score: currentScore.activity_score + amount,
        total_score: currentScore.total_score + amount,
        updated_at: now
      })
      .eq('user_id', user.id)
  } else {
    await supabase
      .from('user_scores')
      .insert({
        user_id: user.id,
        activity_score: amount,
        title_bonus: 0,
        total_score: amount,
        updated_at: now
      })
  }
}
