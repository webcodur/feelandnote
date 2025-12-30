'use server'

import { createClient } from '@/lib/supabase/server'

export interface PublicUserProfile {
  id: string
  nickname: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  stats: {
    content_count: number
    follower_count: number
    following_count: number
  }
  is_following: boolean
  is_follower: boolean
  is_blocked: boolean
}

interface GetUserProfileResult {
  success: boolean
  data?: PublicUserProfile
  error?: string
}

export async function getUserProfile(userId: string): Promise<GetUserProfileResult> {
  const supabase = await createClient()

  // 현재 로그인한 사용자 확인
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // 대상 유저 프로필 조회
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, created_at')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return { success: false, error: '사용자를 찾을 수 없습니다.' }
  }

  // 콘텐츠 수 조회 (공개 기록이 있는 콘텐츠)
  const { count: contentCount } = await supabase
    .from('user_contents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // 소셜 통계 조회
  const { data: socialStats } = await supabase
    .from('user_social')
    .select('follower_count, following_count')
    .eq('user_id', userId)
    .single()

  // 팔로우 상태 확인 (로그인한 경우만)
  let isFollowing = false
  let isFollower = false
  let isBlocked = false

  if (currentUser && currentUser.id !== userId) {
    // 내가 이 유저를 팔로우하는지
    const { data: followingData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId)
      .single()
    isFollowing = !!followingData

    // 이 유저가 나를 팔로우하는지
    const { data: followerData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', currentUser.id)
      .single()
    isFollower = !!followerData

    // 차단 상태 확인
    const { data: blockData } = await supabase
      .from('blocks')
      .select('id')
      .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`)
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
      .single()
    isBlocked = !!blockData
  }

  return {
    success: true,
    data: {
      id: profile.id,
      nickname: profile.nickname || 'User',
      avatar_url: profile.avatar_url,
      bio: null, // TODO: profiles 테이블에 bio 필드 추가 후 연동
      created_at: profile.created_at,
      stats: {
        content_count: contentCount || 0,
        follower_count: socialStats?.follower_count || 0,
        following_count: socialStats?.following_count || 0,
      },
      is_following: isFollowing,
      is_follower: isFollower,
      is_blocked: isBlocked,
    }
  }
}
