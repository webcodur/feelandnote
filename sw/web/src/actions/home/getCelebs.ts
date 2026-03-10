'use server'

import { createClient } from '@/lib/supabase/server'
import { getCelebLevelByRanking } from '@/constants/materials'
import type { CelebProfile, CelebTagInfo } from '@/types/home'

export type CelebSortBy = 'daily_recommend' | 'composite' | 'follower' | 'birth_date_asc' | 'birth_date_desc' | 'name_asc' | 'influence' | 'content_count'

interface GetCelebsParams {
  page?: number
  limit?: number
  profession?: string
  nationality?: string  // 'all' | 'none' | 국가명
  contentType?: string  // 'all' | 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC' | 'CERTIFICATE'
  gender?: string  // 'all' | 'male' | 'female' (DB: true=male, false=female)
  sortBy?: CelebSortBy
  search?: string  // 이름 검색
  tagId?: string  // 태그 필터
  minContentCount?: number // 최소 컨텐츠 개수
  includeInactive?: boolean // 비활성화된 셀럽 포함 여부
  tier?: 'full' | 'light' // celeb_tier 필터
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
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  title: string | null
  title_en: string | null
  consumption_philosophy: string | null
  consumption_philosophy_en: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  bio: string | null
  bio_en: string | null
  quotes: string | null
  quotes_en: string | null
  is_verified: boolean | null
  claimed_by: string | null
  follower_count: number
  total_score: number
  content_count: number
  celeb_tier: string | null
}

export async function getCelebs(
  params: GetCelebsParams = {}
): Promise<GetCelebsResult> {
  const { page = 1, limit = 8, profession, nationality, contentType, gender, sortBy = 'daily_recommend', search, tagId, minContentCount = 0, includeInactive = false, tier } = params
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
    p_tag_id: tagId ?? null,
    p_min_content_count: minContentCount,
    p_gender: gender ?? null,
    p_include_inactive: includeInactive,
    p_celeb_tier: tier ?? null,
  })
  const total = countData ?? 0

  const totalPages = Math.ceil(total / limit)

  // RPC 함수로 정렬된 셀럽 목록 조회
  const { data, error } = await supabase.rpc('get_celebs_sorted', {
    p_profession: profession ?? null,
    p_nationality: nationality ?? null,
    p_content_type: contentType ?? null,
    p_sort_by: sortBy,
    p_search: search ?? '',
    p_limit: limit,
    p_offset: offset,
    p_tag_id: tagId ?? null,
    p_min_content_count: minContentCount,
    p_gender: gender ?? null,
    p_include_inactive: includeInactive,
    p_celeb_tier: tier ?? null,
  })

  if (error) {
    console.error('셀럽 목록 조회 에러:', error)
    return { celebs: [], total: 0, page, totalPages: 0, error: error.message }
  }

  const rows = (data || []) as CelebRow[]

  // 팔로우 상태 조회
  const celebIds = rows.map(row => row.id)
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

  // 셀럽별 태그 정보 조회 (설명 포함)
  type TagRow = { celeb_id: string; short_desc: string | null; short_desc_en: string | null; long_desc: string | null; long_desc_en: string | null; sort_order: number | null; tag: { id: string; name: string; name_en: string | null; color: string } | null }
  const tagMap = new Map<string, CelebTagInfo[]>()
  const tagSortOrderMap = new Map<string, number>() // 태그별 셀럽 순서 저장 (태그 필터 시 사용)

  if (celebIds.length > 0) {
    const { data: tagAssignments } = await supabase
      .from('celeb_tag_assignments')
      .select('celeb_id, short_desc, short_desc_en, long_desc, long_desc_en, sort_order, tag:celeb_tags(id, name, name_en, color)')
      .in('celeb_id', celebIds) as { data: TagRow[] | null }

    ;(tagAssignments ?? []).forEach(item => {
      if (!item.tag) return
      const existing = tagMap.get(item.celeb_id) ?? []
      existing.push({ ...item.tag, name_en: item.tag.name_en ?? null, short_desc: item.short_desc, short_desc_en: item.short_desc_en, long_desc: item.long_desc, long_desc_en: item.long_desc_en })
      tagMap.set(item.celeb_id, existing)

      // 태그 필터 시 순서 정보 저장
      if (tagId && item.tag.id === tagId) {
        tagSortOrderMap.set(item.celeb_id, item.sort_order ?? 0)
      }
    })
  }

  // 셀럽별 대사 조회 (greeting + quote)
  const greetingMap = new Map<string, string[]>()
  const greetingEnMap = new Map<string, string[]>()
  const quoteMap = new Map<string, string>()
  const quoteEnMap = new Map<string, string>()
  if (celebIds.length > 0) {
    const { data: dialogueRows } = await supabase
      .from('celeb_dialogues')
      .select('celeb_id, lines, lines_en')
      .in('celeb_id', celebIds)

    ;(dialogueRows ?? []).forEach(row => {
      const lines = row.lines as Record<string, any> | null
      const linesEn = row.lines_en as Record<string, any> | null
      if (lines?.greeting) greetingMap.set(row.celeb_id, lines.greeting)
      if (linesEn?.greeting) greetingEnMap.set(row.celeb_id, linesEn.greeting)
      if (lines?.quote) quoteMap.set(row.celeb_id, lines.quote)
      if (linesEn?.quote) quoteEnMap.set(row.celeb_id, linesEn.quote)
    })
  }

  // 음성 보유 셀럽 조회 (voice_v 포함)
  const voiceSet = new Set<string>()
  const voiceVMap = new Map<string, number>()
  if (celebIds.length > 0) {
    const { data: voiceRows } = await supabase
      .from('profiles')
      .select('id, voice_v')
      .in('id', celebIds)
      .eq('has_voice', true)
    ;(voiceRows ?? []).forEach(row => {
      voiceSet.add(row.id)
      voiceVMap.set(row.id, (row as Record<string, unknown>).voice_v as number ?? 0)
    })
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
      slug: row.slug ?? null,
      nickname: row.nickname || '',
      nickname_en: row.nickname_en ?? null,
      avatar_url: row.avatar_url,
      profession: row.profession,
      title: row.title,
      title_en: row.title_en ?? null,
      consumption_philosophy: row.consumption_philosophy,
      consumption_philosophy_en: row.consumption_philosophy_en ?? null,
      nationality: row.nationality,
      birth_date: row.birth_date,
      death_date: row.death_date,
      bio: row.bio,
      bio_en: row.bio_en ?? null,
      quotes: quoteMap.get(row.id) ?? row.quotes ?? null,
      quotes_en: quoteEnMap.get(row.id) ?? row.quotes_en ?? null,
      is_verified: row.is_verified ?? false,
      is_platform_managed: row.claimed_by === null,
      follower_count: row.follower_count,
      content_count: row.content_count ?? 0,
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
      tags: tagMap.get(row.id) ?? [],
      greeting: greetingMap.get(row.id) ?? null,
      greeting_en: greetingEnMap.get(row.id) ?? null,
      has_voice: voiceSet.has(row.id),
      voice_v: voiceVMap.get(row.id) ?? 0,
      celeb_tier: (row.celeb_tier as 'full' | 'light') ?? 'full',
    }
  })

  // 태그 필터 시 sort_order 순서로 재정렬
  if (tagId && tagSortOrderMap.size > 0) {
    celebs.sort((a, b) => {
      const orderA = tagSortOrderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER
      const orderB = tagSortOrderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER
      return orderA - orderB
    })
  }

  return { celebs, total, page, totalPages, error: null }
}
