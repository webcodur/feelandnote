'use server'

// egress-allow: 본인 방명록 읽음 상태 RLS — anon 전환 불가. head:true count로 row 송출 0
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
