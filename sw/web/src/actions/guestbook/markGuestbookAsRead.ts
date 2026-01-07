'use server'

import { createClient } from '@/lib/supabase/server'

// 모든 방명록을 읽음 처리
export async function markGuestbookAsRead(): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('guestbook_entries')
    .update({ is_read: true })
    .eq('profile_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('Mark guestbook as read error:', error)
  }
}
