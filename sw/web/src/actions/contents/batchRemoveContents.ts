'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface BatchRemoveParams {
  userContentIds: string[]
}

export async function batchRemoveContents({ userContentIds }: BatchRemoveParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다')
  if (userContentIds.length === 0) throw new Error('선택된 콘텐츠가 없습니다')

  const { error } = await supabase
    .from('user_contents')
    .delete()
    .eq('user_id', user.id)
    .in('id', userContentIds)

  if (error) {
    console.error('일괄 삭제 에러:', error)
    throw new Error('일괄 삭제에 실패했습니다')
  }

  revalidatePath('/archive')
  return { success: true, count: userContentIds.length }
}
