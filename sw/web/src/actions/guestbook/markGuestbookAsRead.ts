'use server'

import { createClient } from '@/lib/db/server'

// 회원 본인의 방명록만 읽음 처리한다. 인물 방명록에는 로그인 소유자가 없다.
export async function markGuestbookAsRead(): Promise<void> {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) return

  const { error } = await db
    .from('member_guestbook_entries')
    .update({ is_read: true })
    .eq('owner_member_id', user.id)
    .eq('is_read', false)

  if (error) console.error('Mark guestbook as read error:', error)
}
