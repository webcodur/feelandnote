'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

interface BlockUserData {
  blocked: true
  // 이미 차단된 상태였다는 뜻. 중복 요청도 성공으로 취급한다(멱등).
  alreadyBlocked: boolean
}

export async function blockUser(targetUserId: string): Promise<ActionResult<BlockUserData>> {
  if (targetUserId.trim().length === 0) {
    return failure('VALIDATION_ERROR', '차단할 사용자가 지정되지 않았다.')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return failure('UNAUTHORIZED')

  if (user.id === targetUserId) {
    return failure('SELF_ACTION', '자기 자신은 차단할 수 없다.')
  }

  // 대상 존재 확인 — 없는 id로 차단 행을 만들면 FK 위반이 되므로 미리 걸러 메시지를 명확히 한다
  const { data: targetUser, error: targetError } = await supabase
    .from('member_profiles')
    .select('id')
    .eq('id', targetUserId)
    .maybeSingle()

  if (targetError) {
    return handleSupabaseError(targetError, { logPrefix: '[차단 대상 확인]' })
  }

  if (!targetUser) {
    return failure('NOT_FOUND', '사용자를 찾을 수 없다.')
  }

  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: user.id, blocked_id: targetUserId })

  // 이미 차단됨(unique blocker_id + blocked_id) — 요청한 상태와 결과가 같으므로 성공이다
  if (error?.code === '23505') {
    return success({ blocked: true, alreadyBlocked: true })
  }

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[사용자 차단]' })
  }

  revalidatePath(`/${targetUserId}`)

  return success({ blocked: true, alreadyBlocked: false })
}
