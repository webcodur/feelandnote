'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

const MAX_PINNED = 10

interface TogglePinParams {
  userContentId: string
  isPinned: boolean
}

export async function togglePin({ userContentId, isPinned }: TogglePinParams): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 핀 추가 시 개수 체크
  if (isPinned) {
    const { count } = await supabase
      .from('user_contents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_pinned', true)

    if ((count ?? 0) >= MAX_PINNED) {
      return failure('LIMIT_EXCEEDED', `최대 ${MAX_PINNED}개까지 고정할 수 있다.`)
    }
  }

  const { error } = await supabase
    .from('user_contents')
    .update({
      is_pinned: isPinned,
      pinned_at: isPinned ? new Date().toISOString() : null,
    })
    .eq('id', userContentId)
    .eq('user_id', user.id)

  if (error) {
    return handleSupabaseError(error, { context: 'content', logPrefix: '[핀 상태 변경]' })
  }

  revalidatePath('/archive')

  return success(null)
}

export async function getPinnedCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return 0

  const { count } = await supabase
    .from('user_contents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_pinned', true)

  return count ?? 0
}
