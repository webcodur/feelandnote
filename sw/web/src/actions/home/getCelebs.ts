'use server'

import { createClient } from '@/lib/supabase/server'
import type { CelebProfile } from '@/types/home'

interface GetCelebsParams {
  page?: number
  limit?: number
}

interface GetCelebsResult {
  celebs: CelebProfile[]
  total: number
  page: number
  totalPages: number
  error: string | null
}

export async function getCelebs(
  params: GetCelebsParams = {}
): Promise<GetCelebsResult> {
  const { page = 1, limit = 8 } = params
  const offset = (page - 1) * limit

  const supabase = await createClient()

  // 현재 로그인 유저 확인
  const { data: { user } } = await supabase.auth.getUser()

  // 전체 개수 조회
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')

  const total = count ?? 0
  const totalPages = Math.ceil(total / limit)

  // 셀럽 프로필과 팔로워 수를 함께 조회
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      nickname,
      avatar_url,
      profession,
      bio,
      is_verified,
      claimed_by,
      user_social(follower_count)
    `)
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('셀럽 목록 조회 에러:', error)
    return { celebs: [], total: 0, page, totalPages: 0, error: error.message }
  }

  // 팔로우 상태 조회 (로그인한 경우만)
  const celebIds = (data || []).map(row => row.id)
  let myFollowings: Set<string> = new Set()
  let myFollowers: Set<string> = new Set()

  if (user && celebIds.length > 0) {
    // 내가 팔로우 중인 셀럽
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', celebIds)

    myFollowings = new Set((followingData || []).map(f => f.following_id))

    // 나를 팔로우 중인 셀럽 (맞팔 = 친구 체크용)
    const { data: followerData } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', user.id)
      .in('follower_id', celebIds)

    myFollowers = new Set((followerData || []).map(f => f.follower_id))
  }

  // user_social 조인 결과를 평탄화하고 follower_count로 정렬
  const celebs: CelebProfile[] = (data || [])
    .map(row => {
      const social = Array.isArray(row.user_social)
        ? row.user_social[0]
        : row.user_social

      return {
        id: row.id,
        nickname: row.nickname || '',
        avatar_url: row.avatar_url,
        profession: row.profession,
        bio: row.bio,
        is_verified: row.is_verified ?? false,
        is_platform_managed: row.claimed_by === null,
        follower_count: social?.follower_count ?? 0,
        is_following: myFollowings.has(row.id),
        is_follower: myFollowers.has(row.id),
      }
    })
    .sort((a, b) => b.follower_count - a.follower_count)

  return { celebs, total, page, totalPages, error: null }
}
