'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateDateParams {
  userContentId: string
  field: 'created_at' | 'completed_at'
  date: string
}

export async function updateDate({ userContentId, field, date }: UpdateDateParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { error } = await supabase
    .from('user_contents')
    .update({ [field]: date })
    .eq('id', userContentId)
    .eq('user_id', user.id)

  if (error) {
    console.error('날짜 변경 에러:', error)
    throw new Error('날짜 변경에 실패했습니다')
  }

  revalidatePath('/archive')

  return { success: true }
}
