'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateInfluenceRank } from '@feelnnote/ai-services/celeb-profile'
import type { CelebProfile } from '@/types/home'

export type CelebSortBy = 'follower' | 'birth_date_asc' | 'birth_date_desc' | 'name_asc' | 'influence'

interface GetCelebsParams {
  page?: number
  limit?: number
  profession?: string
  nationality?: string  // 'all' | 'none' | 국가명
  contentType?: string  // 'all' | 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC' | 'CERTIFICATE'
  sortBy?: CelebSortBy
}

interface GetCelebsResult {
  celebs: CelebProfile[]
  total: number
  page: number
  totalPages: number
  error: string | null
}

// RPC 함수 반환 타입
interface CelebRow {
  id: string
  nickname: string | null
  avatar_url: string | null
  portrait_url: string | null
  profession: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  bio: string | null
  quotes: string | null
  is_verified: boolean | null
  claimed_by: string | null
  follower_count: number
  total_score: number
}

export async function getCelebs(
  params: GetCelebsParams = {}
): Promise<GetCelebsResult> {
  const { page = 1, limit = 8, profession, nationality, contentType, sortBy = 'influence' } = params
  const offset = (page - 1) * limit

  const supabase = await createClient()

  // 현재 로그인 유저 확인
  const { data: { user } } = await supabase.auth.getUser()

  // 전체 개수 조회
  let countQuery = supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')

  if (profession && profession !== 'all') {
    countQuery = countQuery.eq('profession', profession)
  }

  if (nationality && nationality !== 'all') {
    if (nationality === 'none') {
      countQuery = countQuery.is('nationality', null)
    } else {
      countQuery = countQuery.eq('nationality', nationality)
    }
  }

  const { count } = await countQuery

  const total = count ?? 0
  const totalPages = Math.ceil(total / limit)

  // RPC 함수로 정렬된 셀럽 목록 조회
  const { data, error } = await supabase.rpc('get_celebs_sorted', {
    p_profession: profession ?? null,
    p_nationality: nationality ?? null,
    p_sort_by: sortBy,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    console.error('셀럽 목록 조회 에러:', error)
    return { celebs: [], total: 0, page, totalPages: 0, error: error.message }
  }

  const rows = (data || []) as CelebRow[]

  // 팔로우 상태 및 콘텐츠 카운트 조회
  const celebIds = rows.map(row => row.id)
  let myFollowings: Set<string> = new Set()
  let myFollowers: Set<string> = new Set()
  let contentCountMap: Map<string, number> = new Map()

  if (celebIds.length > 0) {
    // 콘텐츠 카운트 조회 (contentType 필터 적용)
    if (contentType && contentType !== 'all') {
      const { data: contents } = await supabase
        .from('contents')
        .select('id')
        .eq('type', contentType) as { data: { id: string }[] | null }

      if (contents && contents.length > 0) {
        const contentIds = contents.map(c => c.id)
        const { data: contentCountData } = await supabase
          .from('user_contents')
          .select('user_id')
          .in('user_id', celebIds)
          .in('content_id', contentIds) as { data: { user_id: string }[] | null }

        (contentCountData || []).forEach(row => {
          const count = contentCountMap.get(row.user_id) ?? 0
          contentCountMap.set(row.user_id, count + 1)
        })
      }
    } else {
      const { data: contentCountData } = await supabase
        .from('user_contents')
        .select('user_id')
        .in('user_id', celebIds) as { data: { user_id: string }[] | null }

      (contentCountData || []).forEach(row => {
        const count = contentCountMap.get(row.user_id) ?? 0
        contentCountMap.set(row.user_id, count + 1)
      })
    }
  }

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

  // CelebProfile 형태로 변환 (이미 DB에서 정렬됨)
  const celebs: CelebProfile[] = rows.map(row => ({
    id: row.id,
    nickname: row.nickname || '',
    avatar_url: row.avatar_url,
    portrait_url: row.portrait_url,
    profession: row.profession,
    nationality: row.nationality,
    birth_date: row.birth_date,
    death_date: row.death_date,
    bio: row.bio,
    quotes: row.quotes,
    is_verified: row.is_verified ?? false,
    is_platform_managed: row.claimed_by === null,
    follower_count: row.follower_count,
    content_count: contentCountMap.get(row.id) ?? 0,
    is_following: myFollowings.has(row.id),
    is_follower: myFollowers.has(row.id),
    influence: row.total_score > 0 ? {
      total_score: row.total_score,
      rank: calculateInfluenceRank(row.total_score),
    } : null,
  }))

  return { celebs, total, page, totalPages, error: null }
}
