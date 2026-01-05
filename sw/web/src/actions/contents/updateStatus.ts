'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/actions/activity'
import type { ContentStatus } from './addContent'

interface UpdateStatusParams {
  userContentId: string
  status: ContentStatus
}

export async function updateStatus({ userContentId, status }: UpdateStatusParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 이전 상태 조회
  const { data: existing } = await supabase
    .from('user_contents')
    .select('status, content_id')
    .eq('id', userContentId)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('user_contents')
    .update({ status })
    .eq('id', userContentId)
    .eq('user_id', user.id)

  if (error) {
    console.error('상태 변경 에러:', error)
    throw new Error('상태 변경에 실패했습니다')
  }

  revalidatePath('/archive')

  // 활동 로그
  await logActivity({
    actionType: 'STATUS_CHANGE',
    targetType: 'content',
    targetId: userContentId,
    contentId: existing?.content_id,
    metadata: { from: existing?.status, to: status }
  })

  return { success: true }
}
