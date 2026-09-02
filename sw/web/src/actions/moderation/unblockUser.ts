'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'
import { type ActionResult, failure, success, handleDatabaseError } from '@/lib/errors'

interface UnblockUserData {
  blocked: false
  // 실제로 차단 상태였다가 풀린 경우 true. 처음부터 차단하지 않았으면 false.
  wasBlocked: boolean
}

export async function unblockUser(targetUserId: string): Promise<ActionResult<UnblockUserData>> {
  if (targetUserId.trim().length === 0) {
    return failure('VALIDATION_ERROR', '차단을 해제할 사용자가 지정되지 않았다.')
  }

  const db = await createClient()

  const {
    data: { user },
  } = await db.auth.getUser()

  if (!user) return failure('UNAUTHORIZED')

  // 삭제된 행을 돌려받아 실제 해제 여부를 판정한다 — 아무것도 안 지웠는데 해제됐다고 말하지 않는다
  const { data, error } = await db
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', targetUserId)
    .select('id')

  if (error) {
    return handleDatabaseError(error, { logPrefix: '[차단 해제]' })
  }

  const wasBlocked = (data ?? []).length > 0

  if (wasBlocked) {
    revalidatePath(`/${targetUserId}`)
  }

  return success({ blocked: false, wasBlocked })
}
