'use server'

import { createClient } from '@/lib/supabase/server'

export interface FriendInfo {
  id: string
  nickname: string
  avatar_url: string | null
  content_count: number
}

interface GetFriendsResult {
  success: boolean
  data: FriendInfo[]
  error?: string
}

// 친구 = 상호 팔로우 (맞팔)
export async function getFriends(): Promise<GetFriendsResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, data: [], error: 'UNAUTHORIZED' }
  }

  // 내가 팔로우하는 사람들
  const { data: myFollowing } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  if (!myFollowing || myFollowing.length === 0) {
    return { success: true, data: [] }
  }

  const myFollowingIds = myFollowing.map(f => f.following_id)

  // 그 중에서 나를 팔로우하는 사람들 (맞팔)
  const { data: mutualFollows } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', user.id)
    .in('follower_id', myFollowingIds)

  if (!mutualFollows || mutualFollows.length === 0) {
    return { success: true, data: [] }
  }

  const friendIds = mutualFollows.map(f => f.follower_id)

  // 친구들의 프로필 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url')
    .in('id', friendIds)

  // 콘텐츠 수 조회
  const { data: contentCounts } = await supabase
    .from('user_contents')
    .select('user_id')
    .in('user_id', friendIds)

  const countMap: Record<string, number> = {}
  contentCounts?.forEach(c => {
    countMap[c.user_id] = (countMap[c.user_id] || 0) + 1
  })

  const friends: FriendInfo[] = (profiles || []).map(p => ({
    id: p.id,
    nickname: p.nickname || 'User',
    avatar_url: p.avatar_url,
    content_count: countMap[p.id] || 0,
  }))

  return { success: true, data: friends }
}
