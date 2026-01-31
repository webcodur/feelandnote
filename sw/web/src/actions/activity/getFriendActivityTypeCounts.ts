'use server'

import { createClient } from '@/lib/supabase/server'

export type FriendActivityTypeCounts = Record<string, number>

const DEFAULT_COUNTS: FriendActivityTypeCounts = {
  all: 0,
  BOOK: 0,
  VIDEO: 0,
  GAME: 0,
  MUSIC: 0,
  CERTIFICATE: 0,
}

export async function getFriendActivityTypeCounts(): Promise<FriendActivityTypeCounts> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return DEFAULT_COUNTS
  }

  // DB 함수로 한 번에 카운트 조회 (13회 쿼리 → 1회)
  const { data, error } = await supabase.rpc('get_friend_activity_type_counts', {
    p_user_id: user.id,
  })

  if (error || !data) {
    console.error('getFriendActivityTypeCounts error:', error)
    return DEFAULT_COUNTS
  }

  return data as FriendActivityTypeCounts
}
