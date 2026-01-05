'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/actions/activity'

export async function removeContent(userContentId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 삭제 전 content_id 조회 (로그용)
  const { data: existing } = await supabase
    .from('user_contents')
    .select('content_id')
    .eq('id', userContentId)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('user_contents')
    .delete()
    .eq('id', userContentId)
    .eq('user_id', user.id)

  if (error) {
    console.error('콘텐츠 삭제 에러:', error)
    throw new Error('콘텐츠 삭제에 실패했습니다')
  }

  revalidatePath('/archive')

  // 활동 로그
  await logActivity({
    actionType: 'CONTENT_REMOVE',
    targetType: 'content',
    targetId: userContentId,
    contentId: existing?.content_id
  })

  return { success: true }
}
