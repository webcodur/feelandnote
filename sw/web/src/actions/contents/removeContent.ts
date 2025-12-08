'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function removeContent(userContentId: string) {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { error } = await supabase
    .from('user_contents')
    .delete()
    .eq('id', userContentId)
    .eq('user_id', user.id) // 본인 것만 삭제 가능

  if (error) {
    console.error('콘텐츠 삭제 에러:', error)
    throw new Error('콘텐츠 삭제에 실패했습니다')
  }

  revalidatePath('/archive')

  return { success: true }
}
