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

  // 셀럽 프로필과 팔로워 수, 영향력을 함께 조회
  let query = supabase
    .from('profiles')
    .select(`
      id,
      nickname,
      avatar_url,
      portrait_url,
      profession,
      nationality,
      birth_date,
      death_date,
      bio,
      quotes,
      is_verified,
      claimed_by,
      user_social(follower_count),
      celeb_influence(total_score)
    `)
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')

  if (profession && profession !== 'all') {
    query = query.eq('profession', profession)
  }

  if (nationality && nationality !== 'all') {
    if (nationality === 'none') {
      query = query.is('nationality', null)
    } else {
      query = query.eq('nationality', nationality)
    }
  }

  // 정렬 적용 (DB 레벨에서 처리 가능한 것들)
  if (sortBy === 'birth_date_asc') {
    query = query.order('birth_date', { ascending: true, nullsFirst: false })
  } else if (sortBy === 'birth_date_desc') {
    query = query.order('birth_date', { ascending: false, nullsFirst: false })
  } else if (sortBy === 'name_asc') {
    query = query.order('nickname', { ascending: true })
  }

  const { data, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('셀럽 목록 조회 에러:', error)
    return { celebs: [], total: 0, page, totalPages: 0, error: error.message }
  }

  // 팔로우 상태 및 콘텐츠 카운트 조회
  const celebIds = (data || []).map(row => row.id)
  let myFollowings: Set<string> = new Set()
  let myFollowers: Set<string> = new Set()
  let contentCountMap: Map<string, number> = new Map()

  if (celebIds.length > 0) {
    // 콘텐츠 카운트 조회 (contentType 필터 적용)
    if (contentType && contentType !== 'all') {
      // 특정 타입 필터: contents 테이블과 조인하여 해당 타입만 카운트
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
      // 전체 타입: 기존 로직
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

  // user_social, celeb_influence 조인 결과를 평탄화하고 follower_count로 정렬
  const celebs: CelebProfile[] = (data || [])
    .map(row => {
      const social = Array.isArray(row.user_social)
        ? row.user_social[0]
        : row.user_social

      const influenceData = Array.isArray(row.celeb_influence)
        ? row.celeb_influence[0]
        : row.celeb_influence

      return {
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
        follower_count: social?.follower_count ?? 0,
        content_count: contentCountMap.get(row.id) ?? 0,
        is_following: myFollowings.has(row.id),
        is_follower: myFollowers.has(row.id),
        influence: influenceData ? {
          total_score: influenceData.total_score,
          rank: calculateInfluenceRank(influenceData.total_score),
        } : null,
      }
    })

  // join 데이터 기준 정렬은 클라이언트 측에서 처리
  if (sortBy === 'follower') {
    celebs.sort((a, b) => b.follower_count - a.follower_count)
  } else if (sortBy === 'influence') {
    celebs.sort((a, b) => (b.influence?.total_score ?? 0) - (a.influence?.total_score ?? 0))
  }

  return { celebs, total, page, totalPages, error: null }
}
