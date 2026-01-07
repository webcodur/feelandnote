'use server'

import { createClient } from '@/lib/supabase/server'

// 읽지 않은 방명록 개수 조회
export async function getUnreadGuestbookCount(): Promise<number> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('guestbook_entries')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('Get unread guestbook count error:', error)
    return 0
  }

  return count ?? 0
}
