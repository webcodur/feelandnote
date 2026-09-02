'use server'

import { createClient } from '@/lib/db/server'

export async function updateNoteMemo(
  noteId: string,
  memo: string
): Promise<void> {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { error } = await db
    .from('notes')
    .update({ memo, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Update memo error:', error)
    throw new Error('메모 저장에 실패했습니다')
  }
}

