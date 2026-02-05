'use server'

import { createClient } from '@/lib/supabase/server'
import { getTitleInfo } from '@/constants/titles'

export interface FollowingInfo {
  id: string
  nickname: string
  avatar_url: string | null
  bio: string | null
  is_following: boolean // 항상 true (내가 팔로우하는 목록이므로)
  followed_at: string
  selected_title: { name: string; grade: string } | null
}

interface GetFollowingResult {
  success: boolean
  data: FollowingInfo[]
  error?: string
}

export async function getFollowing(userId: string): Promise<GetFollowingResult> {
  const supabase = await createClient()

  const { data: following, error } = await supabase
    .from('follows')
    .select(`
      created_at,
      following:profiles!follows_following_id_fkey(
        id,
        nickname,
        avatar_url,
        bio,
        selected_title
      )
    `)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('팔로잉 조회 에러:', error)
    return { success: false, data: [], error: '팔로잉 목록을 불러올 수 없습니다.' }
  }

  type RawFollowingProfile = { id: string; nickname: string; avatar_url: string | null; bio: string | null; selected_title: string | null }

  const result: FollowingInfo[] = (following || [])
    .filter(f => f.following)
    .map(f => {
      const rawUser = (Array.isArray(f.following) ? f.following[0] : f.following) as RawFollowingProfile
      return {
        id: rawUser.id,
        nickname: rawUser.nickname || 'User',
        avatar_url: rawUser.avatar_url,
        bio: rawUser.bio,
        is_following: true,
        followed_at: f.created_at || '',
        selected_title: getTitleInfo(rawUser.selected_title),
      }
    })

  return { success: true, data: result }
}
