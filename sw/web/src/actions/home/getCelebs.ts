'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_TIERS, type CelebTier } from '@feelandnote/shared/constants/celeb-tiers'
import { resolveCelebContentCount } from '@feelandnote/shared/constants/celeb-content-research'
import { STATIC_REVALIDATE, LIST_REVALIDATE } from '@/lib/cache'
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

// ── 영향력 랭킹 공유 캐시 ────────────────────────────────────────────────
// 같은 요청 안에서 getCelebs(6회 이상 호출)와 getPersonaDistribution이
// selectAllPages(celeb_influence)를 각자 하지 않고 이 캐시 하나만 거치게 한다.
// 1시간 수명: 목록이 갱신될 때 순위가 바뀌어야 하므로 7일이 아니라 한 시간으로 둔다.

interface InfluenceRanking {
  rankingMap: Record<string, number>
  scoreMap: Record<string, number>
  influenceTotal: number
}

async function fetchInfluenceRanking(): Promise<InfluenceRanking> {
  const supabase = createStaticClient()
  const rows = await selectAllPages<Pick<Tables<'celeb_influence'>, 'celeb_id' | 'total_score'>>((from, to) =>
    supabase.from('celeb_influence')
      .select('celeb_id, total_score')
      .gt('total_score', 0)
      .order('total_score', { ascending: false })
      .order('celeb_id', { ascending: true })
      .range(from, to)
  )
  const rankingMap: Record<string, number> = {}
  const scoreMap: Record<string, number> = {}
  rows.forEach((item, index) => {
    rankingMap[item.celeb_id] = index + 1
    scoreMap[item.celeb_id] = item.total_score ?? 0
  })
  return { rankingMap, scoreMap, influenceTotal: rows.length }
}

// getPersonaDistribution도 이 캐시를 공유한다. export.
export const getInfluenceRanking = unstable_cache(
  fetchInfluenceRanking,
  ['influence-ranking'],
  { revalidate: LIST_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)

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
  claimed_by_member_id: string | null
  follower_count: number
  total_score: number
  content_count: number
  celeb_tier: string | null
  /* 아래 4종은 trending 정렬에서만 채워진다 — 다른 정렬 함수는 이 값을 내지 않는다 */
  recent_views?: number | null
  view_count?: number | null
  window_start?: string | null
  window_end?: string | null
}

// 세력도감 인물 행 — 단일 원천은 제작 테이블(faction_people)이고, DB 뷰 faction_atlas_members가
// 웹 전용 배정과 합쳐 준다. 뷰는 자동생성 타입에 없어 로컬로 정의한다.
interface AtlasMemberRow {
  celeb_id: string
  tag_id: string
  short_desc: string | null
  short_desc_en: string | null
  long_desc: string | null
  long_desc_en: string | null
  sort_order: number | null
}

// 인물 행 + 태그 정보 합성 행 (뷰 → celeb_tags 두 단계 조회 결과)
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
  contentResearchStatusMap: Record<string, string>
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
    return { rows: [], total, totalPages, tagMap: {}, tagSortOrderMap: {}, greetingMap: {}, greetingEnMap: {}, quoteMap: {}, quoteEnMap: {}, voiceMap: {}, contentResearchStatusMap: {}, rankingMap: {}, influenceTotal: 0 }
  }

  // 병렬 조회: 태그, 대사, 음성, 콘텐츠 조사 상태 + 영향력 랭킹(공유 캐시)
  const [tagJoinRows, dialogueResult, voiceResult, researchStatusResult, influenceRanking] = await Promise.all([
    // 세력도감 소속 — UNION 뷰는 태그 embed가 안 되므로 뷰 → celeb_tags 두 단계로 읽어 합친다
    (async (): Promise<TagAssignmentJoinRow[]> => {
      const { data: memberRows } = await supabase
        .from('faction_atlas_members')
        .select('celeb_id, tag_id, short_desc, short_desc_en, long_desc, long_desc_en, sort_order')
        .in('celeb_id', celebIds)
        .eq('hidden', false)
        .overrideTypes<AtlasMemberRow[], { merge: false }>()
      if (!memberRows?.length) return []

      const memberTagIds = [...new Set(memberRows.map((r) => r.tag_id))]
      const { data: tagRows } = await supabase
        .from('celeb_tags')
        .select('id, name, name_en, color')
        .in('id', memberTagIds)
        .overrideTypes<{ id: string; name: string; name_en: string | null; color: string }[], { merge: false }>()
      const tagById = new Map((tagRows ?? []).map((t) => [t.id, t]))

      return memberRows.map((r) => ({
        celeb_id: r.celeb_id,
        short_desc: r.short_desc,
        short_desc_en: r.short_desc_en,
        long_desc: r.long_desc,
        long_desc_en: r.long_desc_en,
        sort_order: r.sort_order,
        tag: tagById.get(r.tag_id) ?? null,
      }))
    })(),
    supabase.from('celeb_dialogues')
      .select(DIALOGUE_BRIEF_SELECT_WITH_ID)
      .in('celeb_id', celebIds),
    supabase.from('celebs')
      .select('id, voice_v, voice_speed')
      .in('id', celebIds)
      .eq('has_voice', true),
    supabase.from('celebs')
      .select('id, content_research_status')
      .in('id', celebIds),
    getInfluenceRanking(),
  ])

  // 태그 맵
  const tagMap: Record<string, CelebTagInfo[]> = {}
  const tagSortOrderMap: Record<string, number> = {}
  tagJoinRows.forEach(item => {
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
  ;((voiceResult.data ?? []) as Pick<Tables<'celebs'>, 'id' | 'voice_v' | 'voice_speed'>[]).forEach(row => {
    voiceMap[row.id] = { voice_v: row.voice_v ?? 0, voice_speed: row.voice_speed ?? 1.0 }
  })

  const contentResearchStatusMap: Record<string, string> = {}
  ;(researchStatusResult.data ?? []).forEach(row => {
    contentResearchStatusMap[row.id] = row.content_research_status
  })

  // 영향력 랭킹 — 공유 캐시에서 가져온다
  const { rankingMap, influenceTotal } = influenceRanking

  return {
    rows, total, totalPages, tagMap, tagSortOrderMap,
    greetingMap, greetingEnMap, quoteMap, quoteEnMap,
    voiceMap, contentResearchStatusMap,
    rankingMap, influenceTotal,
  }
}

// unstable_cache 래퍼: 인자를 직렬화 가능한 primitive로 전달
const getCelebsCached = unstable_cache(
  fetchCelebsPublic,
  ['celebs-public'],
  // celebs·celeb_influence(정렬/랭킹) + faction_atlas_members·celeb_tags + celeb_dialogues +
  // 서고 수 필터·정렬(celeb_contents)까지 한 응답에 담는다
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

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user && celebIds.length > 0) {
      const followingResult = await supabase
        .from('member_celeb_follows')
        .select('celeb_id')
        .eq('member_id', user.id)
        .in('celeb_id', celebIds)
      myFollowings = new Set((followingResult.data || []).map(f => f.celeb_id))
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
      is_platform_managed: row.claimed_by_member_id === null,
      follower_count: row.follower_count,
      content_count: resolveCelebContentCount(
        row.content_count,
      pub.contentResearchStatusMap[row.id]
      ),
      is_following: myFollowings.has(row.id),
      // 셀럽→회원 역방향 팔로우는 새 관계 모델에 없다.
      is_follower: false,
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
      recent_views: row.recent_views ?? null,
      view_count: row.view_count ?? null,
      views_window_start: row.window_start ?? null,
      views_window_end: row.window_end ?? null,
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
