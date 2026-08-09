'use server'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

interface FollowingUserInfo {
  id: string
  nickname: string
  avatar_url: string | null
  content_count: number
  is_friend: boolean // 맞팔 여부
}

interface GetMyFollowingResult {
  success: boolean
  data: FollowingUserInfo[]
  error?: string
}

// egress-allow: 본인 가변 데이터 — 캐시 부적합 (팔로우 직후 즉시 갱신 필요, React.cache는 요청 내 dedup만 수행)
// 내가 팔로우하는 사람들 (친구 제외)
export const getMyFollowing = cache(getMyFollowingInner)

async function getMyFollowingInner(): Promise<GetMyFollowingResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, data: [], error: 'UNAUTHORIZED' }
  }

  // 내가 팔로우하는 사람들
  const { data: myFollowing } = await supabase
    .from('member_member_follows')
    .select('followed_member_id')
    .eq('follower_member_id', user.id)

  if (!myFollowing || myFollowing.length === 0) {
    return { success: true, data: [] }
  }

  const followingIds = myFollowing.map(f => f.followed_member_id)

  const [followersBackResult, profilesResult, socialResult] = await Promise.all([
    supabase
      .from('member_member_follows')
      .select('follower_member_id')
      .eq('followed_member_id', user.id)
      .in('follower_member_id', followingIds),
    supabase
      .from('member_profiles')
      .select('id, nickname, avatar_url')
      .in('id', followingIds),
    supabase
      .from('member_social_stats')
      .select('member_id, content_count')
      .in('member_id', followingIds),
  ])

  const friendIds = new Set((followersBackResult.data || []).map(f => f.follower_member_id))

  const countMap: Record<string, number> = {}
  socialResult.data?.forEach(stat => {
    countMap[stat.member_id] = stat.content_count || 0
  })

  type FollowingProfile = { id: string; nickname: string; avatar_url: string | null }
  const profileMap = new Map((profilesResult.data || []).map(profile => [profile.id, profile as FollowingProfile]))

  const result: FollowingUserInfo[] = myFollowing
    .filter(f => profileMap.has(f.followed_member_id))
    .map(f => {
      const profile = profileMap.get(f.followed_member_id) as FollowingProfile
      return {
        id: profile.id,
        nickname: profile.nickname || 'User',
        avatar_url: profile.avatar_url,
        content_count: countMap[profile.id] || 0,
        is_friend: friendIds.has(profile.id),
      }
    })

  return { success: true, data: result }
}
