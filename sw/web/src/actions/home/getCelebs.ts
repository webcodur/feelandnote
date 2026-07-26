'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_TIERS, type CelebTier } from '@feelandnote/shared/constants/celeb-tiers'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { getCelebLevelByRanking } from '@/constants/materials'
import type { CelebProfile, CelebTagInfo } from '@/types/home'
import type { Tables } from '@/types/supabase'
import { DIALOGUE_BRIEF_SELECT_WITH_ID, type DialogueBriefWithId } from '@/lib/utils/celeb-dialogues'

export type CelebSortBy = 'daily_recommend' | 'composite' | 'follower' | 'birth_date_asc' | 'birth_date_desc' | 'name_asc' | 'influence' | 'content_count' | 'trending'

/** 인기 순위 기간 창. 7일은 표본이 얇아 순위가 매일 뒤집힌다. */
const TRENDING_DAYS = 30

interface GetCelebsParams {
  page?: number
  limit?: number
  profession?: string
  nationality?: string  // 'all' | 'none' | 국가명
  contentType?: string  // 'all' | 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC'
  gender?: string  // 'all' | 'male' | 'female' (DB: true=male, false=female)
  sortBy?: CelebSortBy
  search?: string  // 이름 검색
  tagId?: string  // 태그 필터
  minContentCount?: number // 최소 컨텐츠 개수
  includeInactive?: boolean // 비활성화된 셀럽 포함 여부
  tiers?: readonly CelebTier[] // 노출 등급 필터. 미지정 시 LISTING_DEFAULT_TIERS(full·light)
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
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  bio: string | null
  bio_en: string | null
  is_verified: boolean | null
  claimed_by: string | null
  follower_count: number
  total_score: number
  content_count: number
  celeb_tier: string | null
}

// 태그 조인 select 결과 행
interface TagAssignmentJoinRow {
  celeb_id: string
  short_desc: string | null
  short_desc_en: string | null
  long_desc: string | null
  long_desc_en: string | null
  sort_order: number | null
  tag: { id: string; name: string; name_en: string | null; color: string } | null
}

// --- 공개 데이터 캐싱 (1시간) ---

interface PublicCelebData {
  rows: CelebRow[]
  total: number
  totalPages: number
  tagMap: Record<string, CelebTagInfo[]>
  tagSortOrderMap: Record<string, number>
  greetingMap: Record<string, string[]>
  greetingEnMap: Record<string, string[]>
  quoteMap: Record<string, string>
  quoteEnMap: Record<string, string>
  voiceMap: Record<string, { voice_v: number; voice_speed: number }>
  rankingMap: Record<string, number>
  influenceTotal: number
}

async function fetchCelebsPublic(
  page: number, limit: number, profession: string | null, nationality: string | null,
  contentType: string | null, gender: string | null, sortBy: string,
  search: string | null, tagId: string | null, minContentCount: number,
  includeInactive: boolean, tiers: string[]
): Promise<PublicCelebData> {
  const supabase = createStaticClient()
  const offset = (page - 1) * limit

  let rows: CelebRow[]
  let total: number

  if (sortBy === 'trending') {
    /* 최근 조회수 순 — 기간 창 순위라 필터·페이지 개념이 없다.
       누적으로 뽑으면 앞에 세우는 인물이 영원히 고정되므로 창을 쓴다.
       목록 단일 진입점(get_celebs_sorted)을 건드리지 않기 위해 별도 함수를 둔다. */
    const { data } = await supabase.rpc('get_celebs_trending', {
      p_days: TRENDING_DAYS, p_limit: limit,
    })
    rows = (data || []) as CelebRow[]
    total = rows.length
  } else {
    // 전체 개수 조회
    const { data: countData } = await supabase.rpc('count_celebs_filtered', {
      p_profession: profession, p_nationality: nationality, p_content_type: contentType,
      p_search: search, p_tag_id: tagId, p_min_content_count: minContentCount,
      p_gender: gender, p_include_inactive: includeInactive, p_celeb_tiers: tiers,
    })
    total = countData ?? 0

    // 정렬된 셀럽 목록 조회
    const { data } = await supabase.rpc('get_celebs_sorted', {
      p_profession: profession, p_nationality: nationality, p_content_type: contentType,
      p_sort_by: sortBy, p_search: search ?? '', p_limit: limit, p_offset: offset,
      p_tag_id: tagId, p_min_content_count: minContentCount, p_gender: gender,
      p_include_inactive: includeInactive, p_celeb_tiers: tiers,
    })
    rows = (data || []) as CelebRow[]
  }

  const totalPages = Math.ceil(total / limit)
  const celebIds = rows.map(row => row.id)

  if (celebIds.length === 0) {
    return { rows: [], total, totalPages, tagMap: {}, tagSortOrderMap: {}, greetingMap: {}, greetingEnMap: {}, quoteMap: {}, quoteEnMap: {}, voiceMap: {}, rankingMap: {}, influenceTotal: 0 }
  }

  // 병렬 조회: 태그, 대사, 음성, 영향력
  const [tagResult, dialogueResult, voiceResult, influenceRows] = await Promise.all([
    supabase.from('celeb_tag_assignments')
      .select('celeb_id, short_desc, short_desc_en, long_desc, long_desc_en, sort_order, tag:celeb_tags(id, name, name_en, color)')
      .in('celeb_id', celebIds),
    supabase.from('celeb_dialogues')
      .select(DIALOGUE_BRIEF_SELECT_WITH_ID)
      .in('celeb_id', celebIds),
    supabase.from('profiles')
      .select('id, voice_v, voice_speed')
      .in('id', celebIds)
      .eq('has_voice', true),
    // 전체 순위를 매기는 목록이라 전수가 필요하다. 1,000행 상한에 걸리므로 나눠 받는다 —
    // 자르면 1,001위부터가 순위 없음으로 떨어지고 influenceTotal(분모)도 함께 축소된다.
    // total_score는 동점이 많아 정렬키로 불충분 — celeb_id를 2차 키로 둬 페이지 경계를 고정한다.
    selectAllPages<Pick<Tables<'celeb_influence'>, 'celeb_id' | 'total_score'>>((from, to) =>
      supabase.from('celeb_influence')
        .select('celeb_id, total_score')
        .gt('total_score', 0)
        .order('total_score', { ascending: false })
        .order('celeb_id', { ascending: true })
        .range(from, to)
    ),
  ])

  // 태그 맵
  const tagMap: Record<string, CelebTagInfo[]> = {}
  const tagSortOrderMap: Record<string, number> = {}
  // 다대일 조인(tag)을 supabase가 배열로 잘못 추론하므로 unknown 경유 캐스트
  ;((tagResult.data ?? []) as unknown as TagAssignmentJoinRow[]).forEach(item => {
    if (!item.tag) return
    const existing = tagMap[item.celeb_id] ?? []
    existing.push({ ...item.tag, name_en: item.tag.name_en ?? null, short_desc: item.short_desc, short_desc_en: item.short_desc_en, long_desc: item.long_desc, long_desc_en: item.long_desc_en })
    tagMap[item.celeb_id] = existing
    if (tagId && item.tag.id === tagId) {
      tagSortOrderMap[item.celeb_id] = item.sort_order ?? 0
    }
  })

  // 대사 맵
  const greetingMap: Record<string, string[]> = {}
  const greetingEnMap: Record<string, string[]> = {}
  const quoteMap: Record<string, string> = {}
  const quoteEnMap: Record<string, string> = {}
  ;((dialogueResult.data ?? []) as unknown as DialogueBriefWithId[]).forEach(row => {
    if (row.greeting) greetingMap[row.celeb_id] = row.greeting
    if (row.greeting_en) greetingEnMap[row.celeb_id] = row.greeting_en
    if (row.quote) quoteMap[row.celeb_id] = row.quote
    if (row.quote_en) quoteEnMap[row.celeb_id] = row.quote_en
  })

  // 음성 맵
  const voiceMap: Record<string, { voice_v: number; voice_speed: number }> = {}
  ;((voiceResult.data ?? []) as Pick<Tables<'profiles'>, 'id' | 'voice_v' | 'voice_speed'>[]).forEach(row => {
    voiceMap[row.id] = { voice_v: row.voice_v ?? 0, voice_speed: row.voice_speed ?? 1.0 }
  })

  // 영향력 랭킹 맵
  const rankingMap: Record<string, number> = {}
  influenceRows.forEach((item, index) => {
    rankingMap[item.celeb_id] = index + 1
  })

  return {
    rows, total, totalPages, tagMap, tagSortOrderMap,
    greetingMap, greetingEnMap, quoteMap, quoteEnMap,
    voiceMap, rankingMap, influenceTotal: influenceRows.length,
  }
}

// unstable_cache 래퍼: 인자를 직렬화 가능한 primitive로 전달
const getCelebsCached = unstable_cache(
  fetchCelebsPublic,
  ['celebs-public'],
  // profiles·celeb_influence(정렬/랭킹) + celeb_tag_assignments·celeb_tags + celeb_dialogues +
  // 서고 수 필터·정렬(user_contents)까지 한 응답에 담는다
  {
    revalidate: STATIC_REVALIDATE,
    tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES, CACHE_TAGS.TAGS],
  }
)

export async function getCelebs(
  params: GetCelebsParams = {}
): Promise<GetCelebsResult> {
  const { page = 1, limit = 8, profession, nationality, contentType, gender, sortBy = 'daily_recommend', search, tagId, minContentCount = 0, includeInactive = false, tiers } = params

  // 1. 캐싱된 공개 데이터 조회
  const pub = await getCelebsCached(
    page, limit, profession ?? null, nationality ?? null,
    contentType ?? null, gender ?? null, sortBy,
    search ?? null, tagId ?? null, minContentCount,
    includeInactive, [...(tiers ?? LISTING_DEFAULT_TIERS)]
  )

  if (pub.rows.length === 0) {
    return { celebs: [], total: pub.total, page, totalPages: pub.totalPages, error: null }
  }

  // 2. 유저별 팔로우 상태 (동적 — 캐싱 불가)
  const celebIds = pub.rows.map(row => row.id)
  let myFollowings = new Set<string>()
  let myFollowers = new Set<string>()

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user && celebIds.length > 0) {
      const [followingResult, followerResult] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', user.id).in('following_id', celebIds),
        supabase.from('follows').select('follower_id').eq('following_id', user.id).in('follower_id', celebIds),
      ])
      myFollowings = new Set((followingResult.data || []).map(f => f.following_id))
      myFollowers = new Set((followerResult.data || []).map(f => f.follower_id))
    }
  } catch {
    // 캐시 컨텍스트에서 cookies 접근 실패 시 무시
  }

  // 3. CelebProfile 조합
  const celebs: CelebProfile[] = pub.rows.map((row) => {
    const ranking = pub.rankingMap[row.id]
    const percentile = ranking && pub.influenceTotal > 0
      ? (ranking / pub.influenceTotal) * 100
      : 100
    const voice = pub.voiceMap[row.id]

    return {
      id: row.id,
      slug: row.slug ?? null,
      nickname: row.nickname || '',
      nickname_en: row.nickname_en ?? null,
      avatar_url: row.avatar_url,
      profession: row.profession,
      title: row.title,
      title_en: row.title_en ?? null,
      nationality: row.nationality,
      birth_date: row.birth_date,
      death_date: row.death_date,
      bio: row.bio,
      bio_en: row.bio_en ?? null,
      quotes: pub.quoteMap[row.id] ?? null,
      quotes_en: pub.quoteEnMap[row.id] ?? null,
      is_verified: row.is_verified ?? false,
      is_platform_managed: row.claimed_by === null,
      follower_count: row.follower_count,
      content_count: row.content_count ?? 0,
      is_following: myFollowings.has(row.id),
      is_follower: myFollowers.has(row.id),
      influence: row.total_score > 0 ? {
        total_score: row.total_score,
        level: ranking
          ? getCelebLevelByRanking(ranking, pub.influenceTotal)
          : getCelebLevelByRanking(1, 1),
        ranking,
        percentile,
      } : null,
      tags: pub.tagMap[row.id] ?? [],
      greeting: pub.greetingMap[row.id] ?? null,
      greeting_en: pub.greetingEnMap[row.id] ?? null,
      has_voice: !!voice,
      voice_v: voice?.voice_v ?? 0,
      voice_speed: voice?.voice_speed ?? 1.0,
      celeb_tier: (row.celeb_tier as CelebTier) ?? 'full',
    }
  })

  // 태그 필터 시 sort_order 순서로 재정렬
  if (tagId && Object.keys(pub.tagSortOrderMap).length > 0) {
    celebs.sort((a, b) => {
      const orderA = pub.tagSortOrderMap[a.id] ?? Number.MAX_SAFE_INTEGER
      const orderB = pub.tagSortOrderMap[b.id] ?? Number.MAX_SAFE_INTEGER
      return orderA - orderB
    })
  }

  return { celebs, total: pub.total, page, totalPages: pub.totalPages, error: null }
}
