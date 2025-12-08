'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContentStatus } from './addContent'

interface UpdateStatusParams {
  userContentId: string
  status: ContentStatus
}

export async function updateStatus({ userContentId, status }: UpdateStatusParams) {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { error } = await supabase
    .from('user_contents')
    .update({ status })
    .eq('id', userContentId)
    .eq('user_id', user.id) // 본인 것만 수정 가능

  if (error) {
    console.error('상태 변경 에러:', error)
    throw new Error('상태 변경에 실패했습니다')
  }

  revalidatePath('/archive')

  return { success: true }
}
