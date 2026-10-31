'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { memberContentCacheTag } from '@/lib/memberContentCache'
import { logActivity } from '@/actions/activity'
import type { ContentStatus } from '@/types/database'
import { isContentStatus } from '@feelandnote/shared/constants/statuses'
import { type ActionResult, failure, success, handleDatabaseError } from '@/lib/errors'

interface UpdateStatusParams {
  userContentId: string
  status: ContentStatus
}

/** 감상 여부만 바꾸며 회원이 남긴 별점·감상문은 보존한다. */
export async function updateStatus({ userContentId, status }: UpdateStatusParams): Promise<ActionResult<null>> {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }
  if (!isContentStatus(status)) return failure('VALIDATION_ERROR', '감상 여부를 확인해주세요.')

  // 이전 상태 조회
  const { data: existing, error: existingError } = await db
    .from('member_contents')
    .select('status, content_id')
    .eq('id', userContentId)
    .eq('member_id', user.id)
    .single()
  if (existingError || !existing) return failure('NOT_FOUND')

  const { error } = await db
    .from('member_contents')
    .update({ status })
    .eq('id', userContentId)
    .eq('member_id', user.id)

  if (error) {
    return handleDatabaseError(error, { context: 'content', logPrefix: '[상태 변경]' })
  }

  revalidateTag(memberContentCacheTag(user.id), { expire: 0 })
  revalidatePath(`/${user.id}/reading`)
  revalidatePath('/achievements')
  revalidatePath(`/content/${existing.content_id}`)
  revalidatePath(`/en/content/${existing.content_id}`)

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
