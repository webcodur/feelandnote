'use server'

// egress-allow: 본인 팔로잉 기준 RLS 카운트 — anon 전환 불가. RPC 1회로 페이로드 이미 최소
import { createClient } from '@/lib/supabase/server'

export type FriendActivityTypeCounts = Record<string, number>

const DEFAULT_COUNTS: FriendActivityTypeCounts = {
  all: 0,
  BOOK: 0,
  VIDEO: 0,
  GAME: 0,
  MUSIC: 0,
}

// 미사용 — egress-allow 구조 보존을 위해 export만 해제
async function getFriendActivityTypeCounts(): Promise<FriendActivityTypeCounts> {
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
