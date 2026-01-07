'use server'

import { createClient } from '@/lib/supabase/server'

export interface FollowingUserInfo {
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

// 내가 팔로우하는 사람들 (친구 제외)
export async function getMyFollowing(): Promise<GetMyFollowingResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, data: [], error: 'UNAUTHORIZED' }
  }

  // 내가 팔로우하는 사람들
  const { data: myFollowing } = await supabase
    .from('follows')
    .select(`
      following_id,
      following:profiles!follows_following_id_fkey(
        id,
        nickname,
        avatar_url
      )
    `)
    .eq('follower_id', user.id)

  if (!myFollowing || myFollowing.length === 0) {
    return { success: true, data: [] }
  }

  const followingIds = myFollowing.map(f => f.following_id)

  // 그 중에서 나를 팔로우하는 사람들 (맞팔 체크)
  const { data: followersBack } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', user.id)
    .in('follower_id', followingIds)

  const friendIds = new Set((followersBack || []).map(f => f.follower_id))

  // 콘텐츠 수 조회
  const { data: contentCounts } = await supabase
    .from('user_contents')
    .select('user_id')
    .in('user_id', followingIds)

  const countMap: Record<string, number> = {}
  contentCounts?.forEach(c => {
    countMap[c.user_id] = (countMap[c.user_id] || 0) + 1
  })

  type FollowingProfile = { id: string; nickname: string; avatar_url: string | null }

  const result: FollowingUserInfo[] = myFollowing
    .filter(f => f.following)
    .map(f => {
      const profile = (Array.isArray(f.following) ? f.following[0] : f.following) as FollowingProfile
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
