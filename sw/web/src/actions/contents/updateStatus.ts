'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/actions/activity'
import type { ContentStatus } from '@/types/database'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

interface UpdateStatusParams {
  userContentId: string
  status: ContentStatus
  clearReview?: boolean // WANT로 변경 시 리뷰 초기화
}

/**
 * @deprecated status 컬럼은 더 이상 사용하지 않음.
 * 리뷰(rating/review) 유무로 감상 여부를 판단함.
 * 이 함수는 레거시 호환성을 위해 유지되며, 추후 제거 예정.
 */
export async function updateStatus({ userContentId, status, clearReview }: UpdateStatusParams): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 이전 상태 조회
  const { data: existing } = await supabase
    .from('user_contents')
    .select('status, content_id')
    .eq('id', userContentId)
    .eq('user_id', user.id)
    .single()

  // WANT로 변경 시 리뷰 초기화 옵션
  const updateData = clearReview
    ? { status, rating: null, review: null, is_spoiler: false }
    : { status }

  const { error } = await supabase
    .from('user_contents')
    .update(updateData)
    .eq('id', userContentId)
    .eq('user_id', user.id)

  if (error) {
    return handleSupabaseError(error, { context: 'content', logPrefix: '[상태 변경]' })
  }

  revalidatePath(`/${user.id}/reading`)

  // 활동 로그
  await logActivity({
    actionType: 'STATUS_CHANGE',
    targetType: 'content',
    targetId: userContentId,
    contentId: existing?.content_id,
    metadata: { from: existing?.status, to: status }
  })

  return success(null)
}
