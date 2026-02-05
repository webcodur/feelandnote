'use server'

import { createClient } from '@/lib/supabase/server'
import { getTitleInfo } from '@/constants/titles'

export interface FollowerInfo {
  id: string
  nickname: string
  avatar_url: string | null
  bio: string | null
  is_following: boolean // 내가 이 사람을 팔로우하는지
  followed_at: string
  selected_title: { name: string; grade: string } | null
}

interface GetFollowersResult {
  success: boolean
  data: FollowerInfo[]
  error?: string
}

export async function getFollowers(userId: string): Promise<GetFollowersResult> {
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const { data: followers, error } = await supabase
    .from('follows')
    .select(`
      created_at,
      follower:profiles!follows_follower_id_fkey(
        id,
        nickname,
        avatar_url,
        bio,
        selected_title
      )
    `)
    .eq('following_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('팔로워 조회 에러:', error)
    return { success: false, data: [], error: '팔로워 목록을 불러올 수 없습니다.' }
  }

  let myFollowingIds: string[] = []
  if (currentUser) {
    const { data: myFollowing } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUser.id)

    myFollowingIds = (myFollowing || []).map(f => f.following_id)
  }

  type RawFollowerProfile = { id: string; nickname: string; avatar_url: string | null; bio: string | null; selected_title: string | null }

  const result: FollowerInfo[] = (followers || [])
    .filter(f => f.follower)
    .map(f => {
      const rawFollower = (Array.isArray(f.follower) ? f.follower[0] : f.follower) as RawFollowerProfile
      return {
        id: rawFollower.id,
        nickname: rawFollower.nickname || 'User',
        avatar_url: rawFollower.avatar_url,
        bio: rawFollower.bio,
        is_following: myFollowingIds.includes(rawFollower.id),
        followed_at: f.created_at || '',
        selected_title: getTitleInfo(rawFollower.selected_title),
      }
    })

  return { success: true, data: result }
}
