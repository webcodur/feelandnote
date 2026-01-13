'use server'

import { createClient } from '@/lib/supabase/server'
import { type ActionResult, failure } from '@/lib/errors'

export interface PublicUserProfile {
  id: string
  nickname: string
  avatar_url: string | null
  bio: string | null
  profession: string | null
  profile_type: 'USER' | 'CELEB'
  is_verified: boolean
  created_at: string
  stats: {
    content_count: number
    follower_count: number
    following_count: number
    friend_count: number
    guestbook_count: number
  }
  is_following: boolean
  is_follower: boolean
  is_blocked: boolean
}

export async function getUserProfile(userId: string): Promise<ActionResult<PublicUserProfile>> {
  const supabase = await createClient()

  // 현재 로그인한 사용자 확인
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // 대상 유저 프로필 조회
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, bio, profession, profile_type, is_verified, created_at')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return failure('NOT_FOUND', '사용자를 찾을 수 없다.')
  }

  // 콘텐츠 수 조회 (공개 기록이 있는 콘텐츠)
  const { count: contentCount } = await supabase
    .from('user_contents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // 팔로워/팔로잉 수 조회
  const [followerResult, followingResult] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact' }).eq('following_id', userId),
    supabase.from('follows').select('following_id', { count: 'exact' }).eq('follower_id', userId),
  ])

  // 친구 수 직접 계산 (맞팔)
  let friendCount = 0
  if (followingResult.data && followingResult.data.length > 0) {
    const targetFollowingIds = followingResult.data.map(f => f.following_id)
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)
      .in('follower_id', targetFollowingIds)
    friendCount = count || 0
  }

  // 방명록 수 조회
  const { count: guestbookCount } = await supabase
    .from('guestbook_entries')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', userId)

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
      bio: profile.bio,
      profession: profile.profession,
      profile_type: (profile.profile_type as 'USER' | 'CELEB') || 'USER',
      is_verified: profile.is_verified || false,
      created_at: profile.created_at,
      stats: {
        content_count: contentCount || 0,
        follower_count: followerResult.count || 0,
        following_count: followingResult.count || 0,
        friend_count: friendCount,
        guestbook_count: guestbookCount || 0,
      },
      is_following: isFollowing,
      is_follower: isFollower,
      is_blocked: isBlocked,
    },
  }
}
