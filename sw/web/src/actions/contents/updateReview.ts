'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addActivityScore, checkAchievements, type Title } from '@/actions/achievements'
import { logActivity } from '@/actions/activity'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

interface UpdateReviewParams {
  userContentId: string
  rating?: number | null
  review?: string | null
  isSpoiler?: boolean
}

interface UpdateReviewData {
  unlockedTitles: Title[]
}

export async function updateReview(params: UpdateReviewParams): Promise<ActionResult<UpdateReviewData>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // rating 검증
  if (params.rating !== undefined && params.rating !== null) {
    if (params.rating < 0.5 || params.rating > 5) {
      return failure('VALIDATION_ERROR', '별점은 0.5~5 사이여야 한다.')
    }
  }

  // 기존 데이터 확인 (첫 리뷰 작성인지 확인)
  const { data: existing, error: existingError } = await supabase
    .from('user_contents')
    .select('id, rating, review, content_id')
    .eq('id', params.userContentId)
    .eq('user_id', user.id)
    .single()

  if (existingError || !existing) {
    return failure('NOT_FOUND', '콘텐츠를 찾을 수 없다.')
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
    return handleSupabaseError(error, { context: 'content', logPrefix: '[리뷰 저장]' })
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
    return success({ unlockedTitles: achievementResult.unlocked })
  }

  return success({ unlockedTitles: [] })
}
