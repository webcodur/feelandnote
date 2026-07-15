'use server'

import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { getTitleInfo } from '@/constants/titles'

interface FollowerInfo {
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

type RawFollowerProfile = { id: string; nickname: string; avatar_url: string | null; bio: string | null; selected_title: string | null }

interface PublicFollowerRow {
  created_at: string | null
  follower: RawFollowerProfile | RawFollowerProfile[] | null
}

// 공개 데이터(follows·profiles)만 조회 — viewer 무관, 캐시 가능. 에러는 throw하여 캐시되지 않게 한다
async function fetchFollowersPublic(userId: string): Promise<PublicFollowerRow[]> {
  const supabase = createStaticClient()

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

  if (error) throw error

  return (followers ?? []) as PublicFollowerRow[]
}

const getFollowersPublicCached = unstable_cache(
  fetchFollowersPublic,
  ['followers'],
  // 팔로우 관계(follows)와 팔로워인 일반 사용자 표시 정보만 읽는다. BO 수정 대상이 아니다.
  { revalidate: 3600 }
)

export async function getFollowers(userId: string): Promise<GetFollowersResult> {
  let followers: PublicFollowerRow[]
  try {
    followers = await getFollowersPublicCached(userId)
  } catch (error) {
    console.error('팔로워 조회 에러:', error)
    return { success: false, data: [], error: '팔로워 목록을 불러올 수 없습니다.' }
  }

  const rows = followers
    .filter(f => f.follower)
    .map(f => ({
      raw: (Array.isArray(f.follower) ? f.follower[0] : f.follower) as RawFollowerProfile,
      followedAt: f.created_at || '',
    }))

  // viewer 의존: 내가 이 팔로워들을 팔로우하는지 (캐시 불가)
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  let myFollowingIds: string[] = []
  if (currentUser && rows.length > 0) {
    const { data: myFollowing } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUser.id)
      .in('following_id', rows.map(r => r.raw.id))

    myFollowingIds = (myFollowing || []).map(f => f.following_id)
  }

  const result: FollowerInfo[] = rows.map(({ raw, followedAt }) => ({
    id: raw.id,
    nickname: raw.nickname || 'User',
    avatar_url: raw.avatar_url,
    bio: raw.bio,
    is_following: myFollowingIds.includes(raw.id),
    followed_at: followedAt,
    selected_title: getTitleInfo(raw.selected_title),
  }))

  return { success: true, data: result }
}
