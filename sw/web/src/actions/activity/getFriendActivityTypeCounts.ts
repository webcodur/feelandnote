'use server'

import { createClient } from '@/lib/supabase/server'

const CONTENT_TYPES = ['BOOK', 'VIDEO', 'GAME', 'MUSIC', 'CERTIFICATE'] as const

export type FriendActivityTypeCounts = Record<string, number>

export async function getFriendActivityTypeCounts(): Promise<FriendActivityTypeCounts> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { all: 0, BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0, CERTIFICATE: 0 }
  }

  // 내가 팔로우하는 사람들 ID 조회
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  if (!following || following.length === 0) {
    return { all: 0, BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0, CERTIFICATE: 0 }
  }

  const followingIds = following.map(f => f.following_id)

  // 전체 활동 수
  const { count: totalCount } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .in('user_id', followingIds)
    .in('action_type', ['CONTENT_ADD', 'REVIEW_UPDATE'])

  // 타입별 카운트를 병렬로 조회
  const typeCountPromises = CONTENT_TYPES.map(async (type) => {
    const { data: contents } = await supabase
      .from('contents')
      .select('id')
      .eq('type', type)

    if (!contents || contents.length === 0) {
      return { type, count: 0 }
    }

    const contentIds = contents.map(c => c.id)

    const { count } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .in('user_id', followingIds)
      .in('action_type', ['CONTENT_ADD', 'REVIEW_UPDATE'])
      .in('content_id', contentIds)

    return { type, count: count ?? 0 }
  })

  const typeCounts = await Promise.all(typeCountPromises)

  const counts: FriendActivityTypeCounts = {
    all: totalCount ?? 0,
  }

  for (const { type, count } of typeCounts) {
    counts[type] = count
  }

  return counts
}
