'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateProgressParams {
  userContentId: string
  progress: number
}

export async function updateProgress({ userContentId, progress }: UpdateProgressParams) {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // progress는 0-100 사이 값
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)))

  const { error } = await supabase
    .from('user_contents')
    .update({ progress: clampedProgress })
    .eq('id', userContentId)
    .eq('user_id', user.id)

  if (error) {
    console.error('진행도 변경 에러:', error)
    throw new Error('진행도 변경에 실패했습니다')
  }

  revalidatePath('/archive')

  return { success: true, progress: clampedProgress }
}
