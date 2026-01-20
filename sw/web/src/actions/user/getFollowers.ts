'use server'

import { createClient } from '@/lib/supabase/server'

export interface FollowerInfo {
  id: string
  nickname: string
  avatar_url: string | null
  bio: string | null
  is_following: boolean // 내가 이 사람을 팔로우하는지
  followed_at: string
  selected_title: { id: string; name: string; grade: string } | null
}

interface GetFollowersResult {
  success: boolean
  data: FollowerInfo[]
  error?: string
}

export async function getFollowers(userId: string): Promise<GetFollowersResult> {
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // 해당 유저를 팔로우하는 사람들 조회 (칭호 포함)
  const { data: followers, error } = await supabase
    .from('follows')
    .select(`
      created_at,
      follower:profiles!follows_follower_id_fkey(
        id,
        nickname,
        avatar_url,
        bio,
        selected_title:titles!profiles_selected_title_id_fkey(id, name, grade)
      )
    `)
    .eq('following_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('팔로워 조회 에러:', error)
    return { success: false, data: [], error: '팔로워 목록을 불러올 수 없습니다.' }
  }

  // 내가 팔로우하는 유저 목록 조회
  let myFollowingIds: string[] = []
  if (currentUser) {
    const { data: myFollowing } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUser.id)

    myFollowingIds = (myFollowing || []).map(f => f.following_id)
  }

  type TitleData = { id: string; name: string; grade: string } | null
  type FollowerProfile = { id: string; nickname: string; avatar_url: string | null; bio: string | null; selected_title: TitleData }

  const result: FollowerInfo[] = (followers || [])
    .filter(f => f.follower)
    .map(f => {
      const follower = (Array.isArray(f.follower) ? f.follower[0] : f.follower) as FollowerProfile
      return {
        id: follower.id,
        nickname: follower.nickname || 'User',
        avatar_url: follower.avatar_url,
        bio: follower.bio,
        is_following: myFollowingIds.includes(follower.id),
        followed_at: f.created_at || '',
        selected_title: follower.selected_title,
      }
    })

  return { success: true, data: result }
}
