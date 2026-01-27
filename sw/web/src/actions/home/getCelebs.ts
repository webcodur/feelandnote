'use server'

import { createClient } from '@/lib/supabase/server'
import { getCelebLevelByRanking } from '@/constants/materials'
import type { CelebProfile } from '@/types/home'

export type CelebSortBy = 'follower' | 'birth_date_asc' | 'birth_date_desc' | 'name_asc' | 'influence' | 'content_count'

interface GetCelebsParams {
  page?: number
  limit?: number
  profession?: string
  nationality?: string  // 'all' | 'none' | 국가명
  contentType?: string  // 'all' | 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC' | 'CERTIFICATE'
  sortBy?: CelebSortBy
  search?: string  // 이름 검색
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
  title: string | null
  consumption_philosophy: string | null
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
  const { page = 1, limit = 8, profession, nationality, contentType, sortBy = 'influence', search } = params
  const offset = (page - 1) * limit

  const supabase = await createClient()

  // 현재 로그인 유저 확인
  const { data: { user } } = await supabase.auth.getUser()

  // 전체 개수 조회 (RPC 사용 - 컨텐츠 보유 셀럽만 카운트)
  const { data: countData } = await supabase.rpc('count_celebs_filtered', {
    p_profession: profession ?? null,
    p_nationality: nationality ?? null,
    p_content_type: contentType ?? null,
    p_search: search ?? null,
  })
  const total = countData ?? 0

  const totalPages = Math.ceil(total / limit)

  // RPC 함수로 정렬된 셀럽 목록 조회
  const { data, error } = await supabase.rpc('get_celebs_sorted', {
    p_profession: profession ?? null,
    p_nationality: nationality ?? null,
    p_content_type: contentType ?? null,
    p_sort_by: sortBy,
    p_limit: limit,
    p_offset: offset,
    p_search: search ?? null,
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

  // 전체 영향력 순위 조회 (점수 내림차순 정렬, 고정 순위)
  const { data: influenceRankings } = await supabase
    .from('celeb_influence')
    .select('celeb_id, total_score')
    .gt('total_score', 0)
    .order('total_score', { ascending: false })

  // celeb_id → ranking 매핑 (1부터 시작)
  const rankingMap = new Map<string, number>()
  ;(influenceRankings || []).forEach((item, index) => {
    rankingMap.set(item.celeb_id, index + 1)
  })
  const influenceTotal = influenceRankings?.length ?? 0

  // CelebProfile 형태로 변환
  const celebs: CelebProfile[] = rows.map((row) => {
    // 전체 영향력 순위 (점수 기반 고정)
    const ranking = rankingMap.get(row.id)

    // percentile 계산: 전체 중 순위 기반
    const percentile = ranking && influenceTotal > 0
      ? (ranking / influenceTotal) * 100
      : 100 // 순위 정보 없으면 최하위로 간주

    return {
      id: row.id,
      nickname: row.nickname || '',
      avatar_url: row.avatar_url,
      portrait_url: row.portrait_url,
      profession: row.profession,
      title: row.title,
      consumption_philosophy: row.consumption_philosophy,
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
        level: ranking
          ? getCelebLevelByRanking(ranking, influenceTotal)
          : getCelebLevelByRanking(1, 1),
        ranking,
        percentile,
      } : null,
    }
  })

  return { celebs, total, page, totalPages, error: null }
}
