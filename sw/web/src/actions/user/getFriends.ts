'use server'

import { cache } from 'react'
import { createClient } from '@/lib/db/server'

interface FriendInfo {
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

// egress-allow: 본인 가변 데이터 — 캐시 부적합 (팔로우 직후 즉시 갱신 필요, React.cache는 요청 내 dedup만 수행)
// 친구 = 상호 팔로우 (맞팔)
export const getFriends = cache(getFriendsInner)

async function getFriendsInner(): Promise<GetFriendsResult> {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()

  if (!user) {
    return { success: false, data: [], error: 'UNAUTHORIZED' }
  }

  // 내가 팔로우하는 사람들
  const { data: myFollowing } = await db
    .from('member_member_follows')
    .select('followed_member_id')
    .eq('follower_member_id', user.id)

  if (!myFollowing || myFollowing.length === 0) {
    return { success: true, data: [] }
  }

  const myFollowingIds = myFollowing.map(f => f.followed_member_id)

  // 그 중에서 나를 팔로우하는 사람들 (맞팔)
  const { data: mutualFollows } = await db
    .from('member_member_follows')
    .select('follower_member_id')
    .eq('followed_member_id', user.id)
    .in('follower_member_id', myFollowingIds)

  if (!mutualFollows || mutualFollows.length === 0) {
    return { success: true, data: [] }
  }

  const friendIds = mutualFollows.map(f => f.follower_member_id)

  const [profilesResult, socialResult] = await Promise.all([
    db
      .from('member_profiles')
      .select('id, nickname, avatar_url')
      .in('id', friendIds),
    db
      .from('member_social_stats')
      .select('member_id, content_count')
      .in('member_id', friendIds),
  ])

  const countMap: Record<string, number> = {}
  socialResult.data?.forEach(stat => {
    countMap[stat.member_id] = stat.content_count || 0
  })

  const friends: FriendInfo[] = (profilesResult.data || []).map(p => ({
    id: p.id,
    nickname: p.nickname || 'User',
    avatar_url: p.avatar_url,
    content_count: countMap[p.id] || 0,
  }))

  return { success: true, data: friends }
}
