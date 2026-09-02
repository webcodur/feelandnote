'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

interface UpdateDateParams {
  userContentId: string
  field: 'created_at' | 'completed_at'
  date: string
}

export async function updateDate({ userContentId, field, date }: UpdateDateParams) {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { error } = await db
    .from('member_contents')
    .update({ [field]: date })
    .eq('id', userContentId)
    .eq('member_id', user.id)

  if (error) {
    console.error('날짜 변경 에러:', error)
    throw new Error('날짜 변경에 실패했습니다')
  }

  revalidatePath(`/${user.id}/reading`)

  return { success: true }
}
