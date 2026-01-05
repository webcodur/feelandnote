'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addActivityScore, checkAchievements } from '@/actions/achievements'
import { logActivity } from '@/actions/activity'

interface UpdateReviewParams {
  userContentId: string
  rating?: number | null
  review?: string | null
  isSpoiler?: boolean
}

export async function updateReview(params: UpdateReviewParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // rating 검증
  if (params.rating !== undefined && params.rating !== null) {
    if (params.rating < 0.5 || params.rating > 5) {
      throw new Error('별점은 0.5~5 사이여야 합니다')
    }
  }

  // 기존 데이터 확인 (첫 리뷰 작성인지 확인)
  const { data: existing } = await supabase
    .from('user_contents')
    .select('id, rating, review, content_id')
    .eq('id', params.userContentId)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    throw new Error('콘텐츠를 찾을 수 없습니다')
  }

  const isFirstReview = !existing.rating && !existing.review

  const updateData: { rating?: number | null; review?: string | null; is_spoiler?: boolean } = {}
  if (params.rating !== undefined) updateData.rating = params.rating
  if (params.review !== undefined) updateData.review = params.review
  if (params.isSpoiler !== undefined) updateData.is_spoiler = params.isSpoiler

  const { error } = await supabase
    .from('user_contents')
    .update(updateData)
    .eq('id', params.userContentId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Update review error:', error)
    throw new Error('리뷰 저장에 실패했습니다')
  }

  revalidatePath(`/archive/${existing.content_id}`)
  revalidatePath('/archive')
  revalidatePath('/achievements')

  // 활동 로그
  await logActivity({
    actionType: 'REVIEW_UPDATE',
    targetType: 'content',
    targetId: params.userContentId,
    contentId: existing.content_id,
    metadata: {
      rating: { from: existing.rating, to: params.rating },
      hasReview: !!params.review
    }
  })

  // 첫 리뷰 작성 시 점수 추가
  if (isFirstReview && (params.rating || params.review)) {
    await addActivityScore('Review 작성', 5, params.userContentId)
    const achievementResult = await checkAchievements()
    return { success: true, unlockedTitles: achievementResult.unlocked }
  }

  return { success: true, unlockedTitles: [] }
}
