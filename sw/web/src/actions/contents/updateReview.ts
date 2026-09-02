'use server'

import { revalidatePath } from 'next/cache'
import { logActivity } from '@/actions/activity'
import { type ActionResult, failure, success, handleDatabaseError } from '@/lib/errors'
import { createClient } from '@/lib/db/server'

interface UpdateReviewParams {
  userContentId: string
  rating?: number | null
  review?: string | null
  reviewPresets?: string[] | null
  isSpoiler?: boolean
}

type UpdateReviewData = void

export async function updateReview(params: UpdateReviewParams): Promise<ActionResult<UpdateReviewData>> {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()

  if (!user) {
    return failure('UNAUTHORIZED')
  }

  if (params.rating !== undefined && params.rating !== null) {
    if (params.rating < 0.5 || params.rating > 5) {
      return failure('VALIDATION_ERROR', '별점은 0.5~5 사이여야 합니다.')
    }
  }

  const { data: existing, error: existingError } = await db
    .from('member_contents')
    .select('id, rating, review, content_id')
    .eq('id', params.userContentId)
    .eq('member_id', user.id)
    .single()

  if (existingError || !existing) {
    return failure('NOT_FOUND', '콘텐츠를 찾을 수 없습니다.')
  }

  const updateData: {
    rating?: number | null
    review?: string | null
    review_presets?: string[] | null
    is_spoiler?: boolean
  } = {}
  if (params.rating !== undefined) updateData.rating = params.rating
  if (params.review !== undefined) updateData.review = params.review
  if (params.reviewPresets !== undefined) updateData.review_presets = params.reviewPresets
  if (params.isSpoiler !== undefined) updateData.is_spoiler = params.isSpoiler

  const { error } = await db
    .from('member_contents')
    .update(updateData)
    .eq('id', params.userContentId)
    .eq('member_id', user.id)

  if (error) {
    return handleDatabaseError(error, { context: 'content', logPrefix: '[리뷰 저장]' })
  }

  revalidatePath(`/${user.id}/records/${existing.content_id}`)
  revalidatePath(`/${user.id}/reading`)
  revalidatePath('/achievements')
  revalidatePath(`/content/${existing.content_id}`)
  revalidatePath(`/en/content/${existing.content_id}`)

  await logActivity({
    actionType: 'REVIEW_UPDATE',
    targetType: 'content',
    targetId: params.userContentId,
    contentId: existing.content_id,
    metadata: {
      rating: { from: existing.rating, to: params.rating },
      hasReview: !!params.review,
    },
  })

  return success(undefined)
}
