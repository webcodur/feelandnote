'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { VisibilityType } from '@/types/database'

interface UpdateVisibilityParams {
  userContentId: string
  visibility: VisibilityType
}

export async function updateVisibility({ userContentId, visibility }: UpdateVisibilityParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { error } = await supabase
    .from('user_contents')
    .update({ visibility })
    .eq('id', userContentId)
    .eq('user_id', user.id)

  if (error) {
    console.error('공개 설정 변경 에러:', error)
    throw new Error('공개 설정 변경에 실패했습니다')
  }

  revalidatePath('/archive')

  return { success: true }
}
