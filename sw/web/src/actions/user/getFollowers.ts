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

// 팔로우 FK는 계정 테이블을 가리키므로 표시 프로필은 ID로 한 번 더 조회한다.
async function fetchFollowersPublic(userId: string): Promise<PublicFollowerRow[]> {
  const supabase = createStaticClient()

  const { data: relations, error } = await supabase
    .from('member_member_follows')
    .select('follower_member_id, created_at')
    .eq('followed_member_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!relations?.length) return []

  const { data: profiles, error: profileError } = await supabase
    .from('member_profiles')
    .select('id, nickname, avatar_url, bio, selected_title')
    .in('id', relations.map(relation => relation.follower_member_id))

  if (profileError) throw profileError
  const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]))

  return relations.map(relation => ({
    created_at: relation.created_at,
    follower: profileMap.get(relation.follower_member_id) ?? null,
  })) as PublicFollowerRow[]
}

const getFollowersPublicCached = unstable_cache(
  fetchFollowersPublic,
  ['followers'],
  // 회원 간 팔로우와 회원 표시 정보만 읽는다. BO 수정 대상이 아니다.
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
      .from('member_member_follows')
      .select('followed_member_id')
      .eq('follower_member_id', currentUser.id)
      .in('followed_member_id', rows.map(r => r.raw.id))

    myFollowingIds = (myFollowing || []).map(f => f.followed_member_id)
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
