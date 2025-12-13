'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addActivityScore, checkAchievements } from '@/actions/achievements'

export type RecordType = 'REVIEW' | 'NOTE' | 'QUOTE' | 'CREATION'

interface CreateRecordParams {
  contentId: string
  type: RecordType
  content: string
  rating?: number
  location?: string
}

export async function createRecord(params: CreateRecordParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 콘텐츠가 기록관에 있는지 확인
  const { data: userContent } = await supabase
    .from('user_contents')
    .select('id')
    .eq('user_id', user.id)
    .eq('content_id', params.contentId)
    .single()

  if (!userContent) {
    throw new Error('기록관에 추가된 콘텐츠만 기록할 수 있습니다')
  }

  // rating 검증 (REVIEW 타입일 때만)
  if (params.type === 'REVIEW' && params.rating !== undefined) {
    if (params.rating < 0.5 || params.rating > 5) {
      throw new Error('별점은 0.5~5 사이여야 합니다')
    }
  }

  const { data, error } = await supabase
    .from('records')
    .insert({
      user_id: user.id,
      content_id: params.contentId,
      type: params.type,
      content: params.content,
      rating: params.type === 'REVIEW' ? params.rating : null,
      location: params.location
    })
    .select()
    .single()

  if (error) {
    console.error('Create record error:', error)
    throw new Error('기록 생성에 실패했습니다')
  }

  revalidatePath(`/archive/${params.contentId}`)
  revalidatePath('/archive')
  revalidatePath('/achievements')

  // 업적 시스템: 점수 추가 및 칭호 체크
  const scoreAmount = params.type === 'REVIEW' ? 5 : 2
  const actionText = params.type === 'REVIEW' ? 'Review 작성' : params.type === 'NOTE' ? 'Note 작성' : 'Quote 작성'
  await addActivityScore(actionText, scoreAmount, data.id)
  const achievementResult = await checkAchievements()

  return {
    ...data,
    unlockedTitles: achievementResult.unlocked
  }
}
