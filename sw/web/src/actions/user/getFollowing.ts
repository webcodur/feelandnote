'use server'

import { createClient } from '@/lib/supabase/server'

export interface FollowingInfo {
  id: string
  nickname: string
  avatar_url: string | null
  bio: string | null
  is_following: boolean // 항상 true (내가 팔로우하는 목록이므로)
  followed_at: string
  selected_title: { id: string; name: string; grade: string } | null
}

interface GetFollowingResult {
  success: boolean
  data: FollowingInfo[]
  error?: string
}

export async function getFollowing(userId: string): Promise<GetFollowingResult> {
  const supabase = await createClient()

  // 해당 유저가 팔로우하는 사람들 조회 (칭호 포함)
  const { data: following, error } = await supabase
    .from('follows')
    .select(`
      created_at,
      following:profiles!follows_following_id_fkey(
        id,
        nickname,
        avatar_url,
        bio,
        selected_title:titles!profiles_selected_title_id_fkey(id, name, grade)
      )
    `)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('팔로잉 조회 에러:', error)
    return { success: false, data: [], error: '팔로잉 목록을 불러올 수 없습니다.' }
  }

  type TitleData = { id: string; name: string; grade: string } | null
  type FollowingProfile = { id: string; nickname: string; avatar_url: string | null; bio: string | null; selected_title: TitleData }

  const result: FollowingInfo[] = (following || [])
    .filter(f => f.following)
    .map(f => {
      const followingUser = (Array.isArray(f.following) ? f.following[0] : f.following) as FollowingProfile
      return {
        id: followingUser.id,
        nickname: followingUser.nickname || 'User',
        avatar_url: followingUser.avatar_url,
        bio: followingUser.bio,
        is_following: true,
        followed_at: f.created_at || '',
        selected_title: followingUser.selected_title,
      }
    })

  return { success: true, data: result }
}
