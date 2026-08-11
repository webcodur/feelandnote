'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { type GeneratedInfluence, type GeneratedCelebProfile } from '@feelandnote/ai-services/celeb-profile'
import { notifyIndexNow } from '@/lib/indexnow'
import { revalidateWebCache, revalidateWebItem } from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { resolveCelebContentCount } from '@feelandnote/shared/constants/celeb-content-research'
import { requireAdmin } from '@/lib/admin-auth'
import { assertRouteSafeCelebSlug, previewGeneratedCelebSlug } from '@/lib/celeb-slug'

// #region Types
export interface Celeb {
  id: string
  slug: string | null
  nickname: string | null
  avatar_url: string | null
  portrait_url: string | null
  profession: string | null
  title: string | null
  nationality: string | null
  gender: boolean | null
  birth_date: string | null
  death_date: string | null
  bio: string | null
  cultural_journey: string | null
  is_verified: boolean | null
  status: string
  celeb_tier: string | null
  claimed_by: string | null
  created_at: string
  content_count: number
  content_research_status: string
  content_research_updated_at: string | null
  content_research_confirmed_empty_at: string | null
  follower_count: number
  influence_total: number
}

export interface CelebsResponse {
  celebs: Celeb[]
  total: number
}

export type CelebImageFilter = 'all' | 'missing-avatar' | 'missing-portrait'

interface GetCelebsParams {
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'inactive' | 'suspended' | 'all'
  profession?: string
  tier?: 'full' | 'light' | 'all'
  imageFilter?: CelebImageFilter
  tagId?: string
  sort?: string
  sortOrder?: 'asc' | 'desc'
}

interface CreateCelebInput {
  nickname: string
  nickname_en?: string
  profession?: string
  title?: string
  nationality?: string
  gender?: boolean | null
  birth_date?: string
  death_date?: string
  bio?: string
  cultural_journey?: string
  avatar_url?: string
  is_verified?: boolean
  status?: 'active' | 'inactive' | 'suspended'
  /** 등급은 받지 않는다 — 신규는 항상 light다(NEW_CELEB_TIER 주석 참조) */
  influence?: GeneratedInfluence
}

interface UpdateCelebInput {
  id: string
  nickname?: string
  nickname_en?: string
  profession?: string
  title?: string
  title_en?: string
  nationality?: string
  gender?: boolean | null
  birth_date?: string
  death_date?: string
  bio?: string
  bio_en?: string
  quotes?: string
  quotes_en?: string
  cultural_journey?: string
  cultural_journey_en?: string
  avatar_url?: string
  /** 인물 상세 상단 대표 화보. 빈 문자열이면 내린다 */
  portrait_url?: string
  is_verified?: boolean
  status?: 'active' | 'inactive' | 'suspended'
  celeb_tier?: 'full' | 'light'
  influence?: GeneratedInfluence
}

interface UpdateCelebOptions {
  revalidateAdminRoutes?: boolean
}

type CelebListRow = {
  id: string
  slug: string | null
  nickname: string | null
  avatar_url: string | null
  portrait_url: string | null
  profession: string | null
  title: string | null
  nationality: string | null
  gender: boolean | null
  birth_date: string | null
  death_date: string | null
  bio: string | null
  cultural_journey: string | null
  content_research_status: string | null
  content_research_updated_at: string | null
  content_research_confirmed_empty_at: string | null
  is_verified: boolean | null
  status: string
  celeb_tier: string | null
  claimed_by: string | null
  created_at: string | null
  celeb_metrics?: { follower_count?: number | null }[] | { follower_count?: number | null } | null
  celeb_influence?: { total_score?: number | null }[] | { total_score?: number | null } | null
}

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function mapCelebListRow(row: CelebListRow, contentCount = 0): Celeb {
  const social = getSingleRelation(row.celeb_metrics)
  const influence = getSingleRelation(row.celeb_influence)

  return {
    id: row.id,
    slug: row.slug || null,
    nickname: row.nickname,
    avatar_url: row.avatar_url,
    portrait_url: row.portrait_url,
    profession: row.profession,
    title: row.title,
    nationality: row.nationality,
    gender: row.gender,
    birth_date: row.birth_date,
    death_date: row.death_date,
    bio: row.bio,
    cultural_journey: row.cultural_journey,
    is_verified: row.is_verified,
    status: row.status,
    celeb_tier: row.celeb_tier || 'full',
    claimed_by: row.claimed_by,
    created_at: row.created_at || '',
    content_count: resolveCelebContentCount(
      contentCount,
      row.content_research_status
    ),
    content_research_status: row.content_research_status || 'open',
    content_research_updated_at: row.content_research_updated_at,
    content_research_confirmed_empty_at: row.content_research_confirmed_empty_at,
    follower_count: social?.follower_count || 0,
    influence_total: influence?.total_score || 0,
  }
}

async function getCelebContentCounts(supabase: ReturnType<typeof createAdminClient>, celebIds: string[]) {
  if (celebIds.length === 0) return new Map<string, number>()

  const counts = new Map<string, number>()
  const idChunkSize = 200
  const pageSize = 1000

  for (let chunkStart = 0; chunkStart < celebIds.length; chunkStart += idChunkSize) {
    const idChunk = celebIds.slice(chunkStart, chunkStart + idChunkSize)

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from('celeb_contents')
        .select('id, celeb_id')
        .in('celeb_id', idChunk)
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1)

      if (error) throw error
      for (const row of data ?? []) {
        counts.set(row.celeb_id, (counts.get(row.celeb_id) || 0) + 1)
      }
      if ((data?.length ?? 0) < pageSize) break
    }
  }

  return counts
}

function compareText(a: string | null | undefined, b: string | null | undefined, ascending: boolean) {
  const left = a ?? ''
  const right = b ?? ''
  const result = left.localeCompare(right, 'ko', { numeric: true, sensitivity: 'base' })
  return ascending ? result : -result
}

function compareNumber(a: number, b: number, ascending: boolean) {
  return ascending ? a - b : b - a
}

function compareDate(a: string, b: string, ascending: boolean) {
  return compareNumber(new Date(a).getTime() || 0, new Date(b).getTime() || 0, ascending)
}

function sortCelebs(celebs: Celeb[], sort: string, sortOrder: 'asc' | 'desc') {
  const ascending = sortOrder === 'asc'
  const statusRank: Record<string, number> = {
    active: 0,
    inactive: 1,
    suspended: 2,
    deleted: 3,
  }

  celebs.sort((a, b) => {
    let result = 0

    switch (sort) {
      case 'avatar_url': {
        const left = a.avatar_url ? 1 : 0
        const right = b.avatar_url ? 1 : 0
        result = ascending ? left - right : right - left
        break
      }
      case 'title':
        result = compareText(a.title, b.title, ascending)
        break
      case 'nickname':
        result = compareText(a.nickname, b.nickname, ascending)
        break
      case 'gender': {
        const gA = a.gender === null ? -1 : a.gender ? 1 : 0
        const gB = b.gender === null ? -1 : b.gender ? 1 : 0
        result = compareNumber(gA, gB, ascending)
        break
      }
      case 'celeb_tier':
        result = compareText(a.celeb_tier, b.celeb_tier, ascending)
        break
      case 'profession':
        result = compareText(a.profession, b.profession, ascending)
        break
      case 'nationality':
        result = compareText(a.nationality, b.nationality, ascending)
        break
      case 'status':
        result = compareNumber(statusRank[a.status] ?? 99, statusRank[b.status] ?? 99, ascending)
        break
      case 'influence_total':
        result = compareNumber(a.influence_total, b.influence_total, ascending)
        break
      case 'content_count':
        result = compareNumber(a.content_count, b.content_count, ascending)
        break
      case 'follower_count':
        result = compareNumber(a.follower_count, b.follower_count, ascending)
        break
      case 'created_at':
      default:
        result = compareDate(a.created_at, b.created_at, ascending)
        break
    }

    if (result !== 0) return result

    const createdAtTieBreak = compareDate(a.created_at, b.created_at, false)
    if (createdAtTieBreak !== 0) return createdAtTieBreak

    return compareText(a.nickname, b.nickname, true)
  })
}

function buildCelebListQuery(
  supabase: ReturnType<typeof createAdminClient>,
  params: Pick<GetCelebsParams, 'search' | 'status' | 'profession' | 'tier' | 'imageFilter'>,
  select: string,
  options?: { count?: 'exact'; head?: boolean },
  inIds?: string[]
) {
  const { search, status, profession, tier, imageFilter } = params

  let query = supabase
    .from('celebs')
    .select(select, options)

  if (status && status !== 'all') {
    query = query.eq('publication_status', status)
  } else {
    query = query.in('publication_status', ['active', 'inactive', 'suspended'])
  }

  if (profession && profession !== 'all') {
    query = query.eq('profession', profession)
  }

  if (search) {
    query = query.or(
      `nickname.ilike.%${search}%,nickname_en.ilike.%${search}%,title.ilike.%${search}%,title_en.ilike.%${search}%`
    )
  }

  if (tier && tier !== 'all') {
    query = query.eq('celeb_tier', tier)
  }

  if (imageFilter === 'missing-avatar') {
    query = query.is('avatar_url', null)
  } else if (imageFilter === 'missing-portrait') {
    query = query.is('portrait_url', null)
  }

  if (inIds) {
    query = query.in('id', inIds)
  }

  return query
}

/**
 * 정렬 기준이 celebs 자신의 열이면 DB에 맡긴다 — 그러면 한 화면치만 받아오면 된다.
 *
 * 여기 없는 세 기준은 celebs 밖에 있다. 감상 기록 수는 세어봐야 알고,
 * 영향력·팔로워는 다른 표에 있어 정렬 대상이 되면 후보 전체를 훑을 수밖에 없다.
 */
const CELEB_SORT_COLUMNS: Record<string, string> = {
  created_at: 'created_at',
  nickname: 'nickname',
  title: 'title',
  profession: 'profession',
  nationality: 'nationality',
  status: 'publication_status',
  gender: 'gender',
  celeb_tier: 'celeb_tier',
  avatar_url: 'avatar_url',
}

async function getCelebsByDirectQuery(params: GetCelebsParams = {}): Promise<CelebsResponse> {
  const { page = 1, limit = 20, search, status, profession, tier, imageFilter, tagId, sort = 'created_at', sortOrder = 'desc' } = params
  const supabase = createAdminClient()
  const offset = (page - 1) * limit
  const filters = { search, status, profession, tier, imageFilter }
  const selectFields = `
    id, slug, nickname, avatar_url, portrait_url, profession, title, nationality, gender,
    birth_date, death_date, bio, cultural_journey:consumption_philosophy,
    content_research_status, content_research_updated_at,
    content_research_confirmed_empty_at,
    is_verified, status:publication_status, celeb_tier, claimed_by:claimed_by_member_id, created_at,
    celeb_metrics!celeb_metrics_celeb_id_fkey (follower_count),
    celeb_influence!celeb_influence_celebs_fkey (total_score)
  `

  let tagCelebIds: string[] | undefined
  if (tagId && tagId !== 'all') {
    const { data: tagAssignments, error: tagError } = await supabase
      .from('faction_atlas_members')
      .select('celeb_id')
      .eq('tag_id', tagId)

    if (tagError) {
      console.error('[getCelebsByDirectQuery] 태그 인물 조회 실패:', tagError)
      throw tagError
    }
    tagCelebIds = tagAssignments?.map((a: any) => a.celeb_id) || []
    if (tagCelebIds.length === 0) return { celebs: [], total: 0 }
  }

  const { count, error: countError } = await buildCelebListQuery(supabase, filters, 'id', { count: 'exact', head: true }, tagCelebIds)

  if (countError) {
    console.error('[getCelebsByDirectQuery] count 조회 실패:', countError)
    throw countError
  }

  if (!count) {
    return { celebs: [], total: 0 }
  }

  const sortColumn = CELEB_SORT_COLUMNS[sort]

  if (sortColumn) {
    const ascending = sortOrder === 'asc'
    // 값이 빈 행은 JS 정렬(compareText)에서 빈 문자열로 취급돼 오름차순의 맨 앞에 왔다.
    // DB도 같은 자리에 두도록 nullsFirst를 오름차순 여부에 맞춘다.
    let query = buildCelebListQuery(supabase, filters, selectFields, undefined, tagCelebIds)
      .order(sortColumn, { ascending, nullsFirst: ascending })
    if (sortColumn !== 'created_at') query = query.order('created_at', { ascending: false })
    query = query.order('nickname', { ascending: true, nullsFirst: true })

    const { data, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('[getCelebsByDirectQuery] 목록 조회 실패:', error)
      throw error
    }

    const pageRows = (data || []) as unknown as CelebListRow[]
    const contentCounts = await getCelebContentCounts(supabase, pageRows.map((row) => row.id))

    return {
      celebs: pageRows.map((row) => mapCelebListRow(row, contentCounts.get(row.id) || 0)),
      total: count,
    }
  }

  const rows: CelebListRow[] = []
  const batchSize = 1000

  for (let batchOffset = 0; batchOffset < count; batchOffset += batchSize) {
    const batchEnd = Math.min(batchOffset + batchSize - 1, count - 1)
    const { data: batch, error: batchError } = await buildCelebListQuery(supabase, filters, selectFields, undefined, tagCelebIds)
      .order('id', { ascending: true })
      .range(batchOffset, batchEnd)

    if (batchError) {
      console.error('[getCelebsByDirectQuery] 배치 조회 실패:', batchError)
      throw batchError
    }

    rows.push(...((batch || []) as unknown as CelebListRow[]))
  }

  // 감상 기록 수로 줄을 세울 때만 후보 전원의 기록을 센다.
  if (sort === 'content_count') {
    const contentCounts = await getCelebContentCounts(supabase, rows.map((row) => row.id))
    const celebs = rows.map((row) => mapCelebListRow(row, contentCounts.get(row.id) || 0))
    sortCelebs(celebs, sort, sortOrder)
    return { celebs: celebs.slice(offset, offset + limit), total: count }
  }

  // 영향력·팔로워 정렬은 기록 수와 무관하므로, 줄을 먼저 세우고 화면에 실릴 몫만 센다.
  const ordered = rows.map((row) => mapCelebListRow(row, 0))
  sortCelebs(ordered, sort, sortOrder)
  const pageSlice = ordered.slice(offset, offset + limit)
  const rowById = new Map(rows.map((row) => [row.id, row]))
  const contentCounts = await getCelebContentCounts(supabase, pageSlice.map((celeb) => celeb.id))

  return {
    celebs: pageSlice.map((celeb) => mapCelebListRow(rowById.get(celeb.id)!, contentCounts.get(celeb.id) || 0)),
    total: count,
  }
}

// #endregion

// #region getCelebs
export async function getCelebs(params: GetCelebsParams = {}): Promise<CelebsResponse> {
  const { page = 1, limit = 20, search, status, profession, tier, imageFilter, tagId, sort = 'created_at', sortOrder = 'desc' } = params
  const rpcUnsupportedSorts = ['avatar_url', 'title', 'gender', 'celeb_tier']
  const needsExactFiltering =
    rpcUnsupportedSorts.includes(sort) ||
    sort === 'content_count' ||
    status === 'inactive' ||
    status === 'suspended' ||
    (tier && tier !== 'all') ||
    (imageFilter && imageFilter !== 'all') ||
    (tagId && tagId !== 'all')

  if (needsExactFiltering) {
    return getCelebsByDirectQuery({ page, limit, search, status, profession, tier, imageFilter, tagId, sort, sortOrder })
  }

  const supabase = createAdminClient()
  const offset = (page - 1) * limit

  // RPC 함수 사용 (프로덕션과 동일한 방식)
  const sortByMap: Record<string, string> = {
    content_count: 'content_count',
    follower_count: 'follower',
    influence_total: 'influence',
    nickname: 'name_asc',
    profession: `profession_${sortOrder}`,
    status: `status_${sortOrder}`,
    nationality: `nationality_${sortOrder}`,
    created_at: `created_at_${sortOrder}`,
  }

  const rpcSortBy = sortByMap[sort] || `created_at_${sortOrder}`

  // status 필터: inactive/suspended 보려면 includeInactive 필요
  const includeInactive = status !== 'active'

  // 전체 개수 조회
  const { data: countData, error: countError } = await supabase.rpc('count_celebs_filtered', {
    p_profession: profession && profession !== 'all' ? profession : null,
    p_nationality: null,
    p_content_type: null,
    p_search: search || null,
    p_tag_id: tagId && tagId !== 'all' ? tagId : null,
    p_min_content_count: 0,
    p_gender: null,
    p_include_inactive: includeInactive,
    p_celeb_tiers: null, // 관리자 목록은 등급 제한 없음
  })
  if (countError) throw new Error(`Failed to count celebs: ${countError.message}`)
  const total = countData ?? 0

  // 숫자형 정렬(content_count, follower, influence)은 RPC가 항상 DESC → asc 시 오프셋 반전 필요
  const numericSorts = ['content_count', 'follower', 'influence']
  const needsReverse = sortOrder === 'asc' && numericSorts.includes(rpcSortBy)
  const actualOffset = needsReverse
    ? Math.max(0, total - page * limit)
    : offset

  // 정렬된 셀럽 목록 조회
  const { data, error } = await supabase.rpc('get_celebs_sorted', {
    p_profession: profession && profession !== 'all' ? profession : null,
    p_nationality: null,
    p_content_type: null,
    p_sort_by: rpcSortBy,
    p_search: search || '',
    p_limit: limit,
    p_offset: actualOffset,
    p_tag_id: tagId && tagId !== 'all' ? tagId : null,
    p_min_content_count: 0,
    p_gender: null,
    p_include_inactive: includeInactive,
    p_celeb_tiers: null, // 관리자 목록은 등급 제한 없음
  })

  if (error) {
    console.error('[getCelebs] RPC 조회 실패:', error.message, error.code, error.details)
    throw error
  }

  const rpcRows = data || []
  const rpcCelebIds = rpcRows.map((celeb: any) => celeb.id)
  const researchStatusMap = new Map<string, {
    status: string
    updatedAt: string | null
    confirmedEmptyAt: string | null
    portraitUrl: string | null
  }>()

  if (rpcCelebIds.length > 0) {
    const { data: researchRows, error: researchError } = await supabase
      .from('celebs')
      .select(`
        id, portrait_url, content_research_status, content_research_updated_at,
        content_research_confirmed_empty_at
      `)
      .in('id', rpcCelebIds)

    if (researchError) throw researchError
    for (const row of researchRows ?? []) {
      researchStatusMap.set(row.id, {
        status: row.content_research_status || 'open',
        updatedAt: row.content_research_updated_at,
        confirmedEmptyAt: row.content_research_confirmed_empty_at,
        portraitUrl: row.portrait_url,
      })
    }
  }

  let celebs: Celeb[] = rpcRows.map((celeb: any) => {
    const research = researchStatusMap.get(celeb.id)
    return {
      id: celeb.id,
      slug: celeb.slug || null,
      nickname: celeb.nickname,
      avatar_url: celeb.avatar_url,
      portrait_url: research?.portraitUrl || null,
      profession: celeb.profession,
      title: celeb.title,
      nationality: celeb.nationality,
      gender: celeb.gender ?? null,
      birth_date: celeb.birth_date,
      death_date: celeb.death_date,
      bio: celeb.bio,
      cultural_journey: celeb.consumption_philosophy,
      is_verified: celeb.is_verified,
      status: celeb.status,
      celeb_tier: celeb.celeb_tier || 'full',
      claimed_by: celeb.claimed_by,
      created_at: celeb.created_at || '',
      content_count: resolveCelebContentCount(
        celeb.content_count || 0,
      research?.status
      ),
      content_research_status: research?.status || 'open',
      content_research_updated_at: research?.updatedAt || null,
      content_research_confirmed_empty_at: research?.confirmedEmptyAt || null,
      follower_count: celeb.follower_count || 0,
      influence_total: celeb.total_score || 0,
    }
  })

  // 특정 status 필터링 (RPC는 active/inactive 이분법이므로 JS에서 후처리)
  if (status && status !== 'all') {
    celebs = celebs.filter((c) => c.status === status)
  }

  // tier 필터링 (RPC 미지원 → JS 후처리)
  if (tier && tier !== 'all') {
    celebs = celebs.filter((c) => c.celeb_tier === tier)
  }

  // 숫자형 정렬은 RPC가 항상 DESC → asc 시 결과 뒤집기
  if (needsReverse) {
    celebs.reverse()
  }

  return {
    celebs,
    total: (status && status !== 'all') || (tier && tier !== 'all') ? celebs.length : total,
  }
}
// #endregion

// 아바타 유무 정렬 전용 조회는 제거했다(26.08.08). 그 정렬은 언제나 위쪽
// getCelebsByDirectQuery로 갈라져 이 함수까지 닿은 적이 없다.

// #region getCeleb
export async function getCeleb(celebId: string): Promise<Celeb | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('celebs')
    .select(
      `
      *,
      status:publication_status,
      claimed_by:claimed_by_member_id,
      cultural_journey:consumption_philosophy,
      celeb_metrics!celeb_metrics_celeb_id_fkey (follower_count),
      celeb_influence!celeb_influence_celebs_fkey (total_score)
    `
    )
    .eq('id', celebId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const { count: contentCount, error: contentCountError } = await supabase
    .from('celeb_contents')
    .select('*', { count: 'exact', head: true })
    .eq('celeb_id', celebId)

  if (contentCountError) throw contentCountError

  const metrics = getSingleRelation(data.celeb_metrics)
  const influence = getSingleRelation(data.celeb_influence)

  return {
    id: data.id,
    slug: data.slug || null,
    nickname: data.nickname,
    avatar_url: data.avatar_url,
    portrait_url: data.portrait_url,
    profession: data.profession,
    title: data.title,
    nationality: data.nationality,
    gender: data.gender,
    birth_date: data.birth_date,
    death_date: data.death_date,
    bio: data.bio,
    cultural_journey: data.cultural_journey,
    is_verified: data.is_verified,
    status: data.status,
    celeb_tier: data.celeb_tier || 'full',
    claimed_by: data.claimed_by,
    created_at: data.created_at,
    influence_total: influence?.total_score || 0,
    content_count: resolveCelebContentCount(
      contentCount || 0,
      data.content_research_status
    ),
    content_research_status: data.content_research_status || 'open',
    content_research_updated_at: data.content_research_updated_at || null,
    content_research_confirmed_empty_at:
      data.content_research_confirmed_empty_at || null,
    follower_count: metrics?.follower_count || 0,
  }
}
// #endregion

// #region createCeleb
/**
 * 새로 만드는 인물의 등급은 언제나 light다.
 *
 * DB 트리거 `trg_celeb_full_requires_content`가 감상 기록이 한 건도 없는 인물의
 * full 등급을 막는다(2026-06-22 설치). 방금 만든 인물은 기록이 있을 수 없으므로
 * 등록 시점에 full을 고를 여지 자체가 없다. 기록을 채운 뒤 목록에서 올린다.
 */
const NEW_CELEB_TIER = 'light' as const

export async function createCeleb(input: CreateCelebInput): Promise<{ id: string; slug: string }> {
  await requireAdmin()
  // Admin 클라이언트 사용 (RLS 우회 필요)
  const adminClient = createAdminClient()

  const nickname = input.nickname.trim()
  if (!nickname) throw new Error('닉네임을 입력해주세요.')
  const nicknameEn = input.nickname_en?.trim() ?? ''
  if (!nicknameEn) throw new Error('신규 CELEB의 slug 생성을 위해 영문 이름이 필요합니다.')
  const baseSlug = previewGeneratedCelebSlug(nicknameEn)
  if (!baseSlug) throw new Error('영문 이름으로 slug를 생성할 수 없습니다.')

  // 이름 중복을 막고, generated slug 충돌은 slug_suffix로 해소한다.
  const [
    { data: existingName, error: nameError },
    { data: existingNameEn, error: nameEnError },
    { data: slugRows, error: slugError },
  ] = await Promise.all([
    adminClient.from('celebs').select('id')
      .eq('nickname', nickname).neq('publication_status', 'deleted').limit(1),
    adminClient.from('celebs').select('id')
      .eq('nickname_en', nicknameEn).neq('publication_status', 'deleted').limit(1),
    adminClient.from('celebs').select('slug').like('slug', `${baseSlug}%`),
  ])
  if (nameError) throw nameError
  if (nameEnError) throw nameEnError
  if (slugError) throw slugError

  if (existingName?.length || existingNameEn?.length) {
    throw new Error('이미 동일한 이름의 셀럽이 존재합니다.')
  }
  const occupied = new Set((slugRows ?? []).flatMap(row => row.slug ? [row.slug as string] : []))
  let slugSuffix: string | null = null
  if (occupied.has(baseSlug)) {
    for (let suffix = 2; ; suffix++) {
      if (!occupied.has(`${baseSlug}-${suffix}`)) {
        slugSuffix = String(suffix)
        break
      }
    }
  }

  // 인물은 로그인 계정을 갖지 않는다.
  // 셀럽 UUID는 Auth 회원과 독립적으로 발급한다.
  const celebId = crypto.randomUUID()

  try {
    // celebs에 인물을 등록한다. slug는 nickname_en·slug_suffix로 자동 계산되는 열이다.
    const { data: insertedProfile, error: profileError } = await adminClient
      .from('celebs')
      .insert({
        id: celebId,
        nickname,
        nickname_en: nicknameEn,
        slug_suffix: slugSuffix,
        profession: input.profession || null,
        title: input.title || null,
        nationality: input.nationality || null,
        gender: input.gender ?? null,
        birth_date: input.birth_date || null,
        death_date: input.death_date || null,
        bio: input.bio || null,
        consumption_philosophy: input.cultural_journey || null,
        avatar_url: input.avatar_url || null,
        is_verified: input.is_verified || false,
        publication_status: input.status || 'suspended',
        celeb_tier: NEW_CELEB_TIER,
      })
      .select('slug')
      .single()

    if (profileError) throw profileError
    if (!insertedProfile?.slug) throw new Error('프로필 generated slug가 생성되지 않았습니다.')
    const createdSlug = insertedProfile.slug as string
    assertRouteSafeCelebSlug(createdSlug)

    // 셀럽 지표 초기화
    const { error: metricsError } = await adminClient.from('celeb_metrics').upsert({
      celeb_id: celebId,
      follower_count: 0,
      content_count: 0,
    })

    if (metricsError) throw metricsError

    // 영향력 저장 (AI 생성된 경우)
    if (input.influence) {
      const inf = input.influence
      const { error: influenceError } = await adminClient.from('celeb_influence').upsert({
        celeb_id: celebId,
        political: inf.political.score,
        political_exp: inf.political.exp,
        strategic: inf.strategic.score,
        strategic_exp: inf.strategic.exp,
        tech: inf.tech.score,
        tech_exp: inf.tech.exp,
        social: inf.social.score,
        social_exp: inf.social.exp,
        economic: inf.economic.score,
        economic_exp: inf.economic.exp,
        cultural: inf.cultural.score,
        cultural_exp: inf.cultural.exp,
        transhistoricity: inf.transhistoricity.score,
        transhistoricity_exp: inf.transhistoricity.exp,
        total_score: inf.totalScore,
      }, { onConflict: 'celeb_id' })

      if (influenceError) throw influenceError
    }

    revalidatePath('/celebs')
    // celebs + celeb_metrics + celeb_influence 신규
    await revalidateWebCache(CACHE_TAGS.CELEBS)

    return { id: celebId, slug: createdSlug }
  } catch (err) {
    // 어느 단계에서 막히든 셀럽 원본을 지워 CASCADE 관계까지 되돌린다.
    const { error: cleanupError } = await adminClient.from('celebs').delete().eq('id', celebId)
    if (cleanupError) {
      throw new AggregateError([err, cleanupError], '셀럽 등록 실패 후 정리에도 실패했습니다.')
    }
    throw err
  }
}

// #endregion

// #region updateCeleb
export async function updateCeleb(
  input: UpdateCelebInput,
  { revalidateAdminRoutes = true }: UpdateCelebOptions = {}
): Promise<void> {
  await requireAdmin()
  const adminClient = createAdminClient()

  const updateData: Record<string, unknown> = {}

  if (input.nickname !== undefined) updateData.nickname = input.nickname
  if (input.nickname_en !== undefined) updateData.nickname_en = input.nickname_en || null
  if (input.profession !== undefined) updateData.profession = input.profession
  if (input.title !== undefined) updateData.title = input.title
  if (input.title_en !== undefined) updateData.title_en = input.title_en || null
  if (input.nationality !== undefined) updateData.nationality = input.nationality
  if (input.gender !== undefined) updateData.gender = input.gender
  if (input.birth_date !== undefined) updateData.birth_date = input.birth_date
  if (input.death_date !== undefined) updateData.death_date = input.death_date
  if (input.bio !== undefined) updateData.bio = input.bio
  if (input.bio_en !== undefined) updateData.bio_en = input.bio_en || null
  if (input.cultural_journey !== undefined) updateData.consumption_philosophy = input.cultural_journey
  if (input.cultural_journey_en !== undefined) updateData.consumption_philosophy_en = input.cultural_journey_en || null
  if (input.avatar_url !== undefined) updateData.avatar_url = input.avatar_url
  if (input.portrait_url !== undefined) updateData.portrait_url = input.portrait_url || null
  if (input.is_verified !== undefined) updateData.is_verified = input.is_verified
  if (input.status !== undefined) updateData.publication_status = input.status
  if (input.celeb_tier !== undefined) updateData.celeb_tier = input.celeb_tier

  const { error } = await adminClient
    .from('celebs')
    .update(updateData)
    .eq('id', input.id)

  if (error) throw error

  // quotes → celeb_dialogues.lines.quote 저장 (SSoT)
  if (input.quotes !== undefined || input.quotes_en !== undefined) {
    const { data: existing, error: dialogueReadError } = await adminClient
      .from('celeb_dialogues')
      .select('lines, lines_en')
      .eq('celeb_id', input.id)
      .maybeSingle()

    if (dialogueReadError) throw dialogueReadError

    const updates: Record<string, any> = { celeb_id: input.id }
    if (input.quotes !== undefined) {
      updates.lines = { ...((existing?.lines as Record<string, any>) ?? {}), quote: input.quotes ?? '' }
    }
    if (input.quotes_en !== undefined) {
      updates.lines_en = { ...((existing?.lines_en as Record<string, any>) ?? {}), quote: input.quotes_en ?? '' }
    }
    const { error: dialogueWriteError } = await adminClient
      .from('celeb_dialogues')
      .upsert(updates, { onConflict: 'celeb_id' })
    if (dialogueWriteError) throw dialogueWriteError
  }

  // 영향력 저장
  if (input.influence) {
    const inf = input.influence
    const { error: influenceError } = await adminClient
      .from('celeb_influence').upsert({
      celeb_id: input.id,
      political: inf.political.score,
      political_exp: inf.political.exp,
      strategic: inf.strategic.score,
      strategic_exp: inf.strategic.exp,
      tech: inf.tech.score,
      tech_exp: inf.tech.exp,
      social: inf.social.score,
      social_exp: inf.social.exp,
      economic: inf.economic.score,
      economic_exp: inf.economic.exp,
      cultural: inf.cultural.score,
      cultural_exp: inf.cultural.exp,
      transhistoricity: inf.transhistoricity.score,
      transhistoricity_exp: inf.transhistoricity.exp,
      total_score: inf.totalScore,
    }, { onConflict: 'celeb_id' })

    if (influenceError) throw influenceError
  }

  if (revalidateAdminRoutes) revalidatePath('/celebs')
  // 상세는 slug로 주소가 잡힌다(/celebs/[slug]). id로 짚으면 빗나가므로 라우트 패턴으로 지정
  if (revalidateAdminRoutes) revalidatePath('/celebs/[slug]', 'page')
  // celebs·celeb_influence 수정 + 명언(quotes)이 오면 celeb_dialogues까지 건드린다
  await revalidateWebCache([CACHE_TAGS.CELEBS, CACHE_TAGS.DIALOGUES])

  // active 셀럽 정보 변경 시 IndexNow 색인 요청
  const { data: profile, error: profileReadError } = await adminClient
    .from('celebs')
    .select('slug, publication_status')
    .eq('id', input.id)
    .single()
  if (profileReadError) throw profileReadError
  if (profile?.publication_status === 'active' && profile?.slug) {
    notifyIndexNow([`/celeb/${profile.slug}`])
  }
}
// #endregion

// #region toggleCelebTier
export async function toggleCelebTier(celebId: string, currentTier: string): Promise<void> {
  await requireAdmin()
  const supabase = createAdminClient()
  const newTier = currentTier === 'light' ? 'full' : 'light'

  const { error } = await supabase
    .from('celebs')
    .update({ celeb_tier: newTier })
    .eq('id', celebId)

  if (error) throw error

  revalidatePath('/celebs')
  // celebs.celeb_tier
  await revalidateWebItem(CACHE_TAGS.CELEBS, celebId)
}
// #endregion

// #region toggleCelebStatus
export async function toggleCelebStatus(celebId: string, currentStatus: string): Promise<string> {
  await requireAdmin()
  const supabase = createAdminClient()
  const cycle: Record<string, string> = {
    active: 'inactive',
    inactive: 'active',
    suspended: 'active',
  }
  const newStatus = cycle[currentStatus] || 'active'

  if (newStatus === 'active') {
    const { data: profile, error: profileError } = await supabase
      .from('celebs')
      .select('avatar_url')
      .eq('id', celebId)
      .single()

    if (profileError) throw profileError
    if (!profile.avatar_url?.trim()) {
      throw new Error('아바타가 없는 인물은 활성화할 수 없습니다.')
    }
  }

  const { error } = await supabase
    .from('celebs')
    .update({ publication_status: newStatus })
    .eq('id', celebId)

  if (error) throw error

  // active 전환 시 IndexNow 색인 요청
  if (newStatus === 'active') {
    const { data: profile, error: profileError } = await supabase
      .from('celebs')
      .select('slug')
      .eq('id', celebId)
      .single()
    if (profileError) throw profileError
    if (profile?.slug) {
      notifyIndexNow([`/celeb/${profile.slug}`])
    }
  }

  revalidatePath('/celebs')
  // celebs.publication_status — 인물의 노출 자체가 바뀐다. 관련 도메인을 전부 갱신한다.
  await revalidateWebCache([
    CACHE_TAGS.CELEBS,
    CACHE_TAGS.DIALOGUES,
    CACHE_TAGS.PERSONA,
    CACHE_TAGS.TAGS,
  ])
  return newStatus
}
// #endregion

// #region deleteCeleb
export async function deleteCeleb(celebId: string): Promise<void> {
  await requireAdmin()
  const supabase = createAdminClient()

  // 소프트 삭제 (publication_status를 'deleted'로 변경)
  const { error } = await supabase
    .from('celebs')
    .update({ publication_status: 'deleted' })
    .eq('id', celebId)

  if (error) throw error

  revalidatePath('/celebs')
  revalidatePath('/celebs/titles')
  revalidatePath('/celebs/[slug]', 'page')
  // publication_status='deleted' 소프트 삭제 — 인물이 사이트 전역에서 사라져야 한다
  await revalidateWebCache([
    CACHE_TAGS.CELEBS,
    CACHE_TAGS.DIALOGUES,
    CACHE_TAGS.PERSONA,
    CACHE_TAGS.TAGS,
  ])
}
// #endregion

// #region getCelebContents
export interface CelebContent {
  id: string
  content_id: string
  status: string
  rating: number | null
  review: string | null
  is_spoiler: boolean
  visibility: string
  source_url: string | null
  created_at: string
  updated_at: string
  content: {
    id: string
    title: string
    type: string
    creator: string | null
    thumbnail_url: string | null
    external_source: string | null
  }
}

export async function getCelebContents(
  celebId: string,
  page: number = 1,
  limit: number = 20,
  contentType?: string,
  search?: string
): Promise<{ contents: CelebContent[]; total: number }> {
  const supabase = await createClient()
  const offset = (page - 1) * limit

  // 검색어가 있으면 content_locales에서 먼저 content_id를 찾는 2-step 검색
  let searchContentIds: string[] | null = null
  if (search) {
    const searchTerm = `%${search}%`
    const { data: matchIds, error: searchError } = await supabase
      .from('content_locales')
      .select('content_id')
      .or(`title.ilike.${searchTerm},creator.ilike.${searchTerm}`)
    if (searchError) throw searchError
    searchContentIds = matchIds ? [...new Set(matchIds.map((m) => m.content_id))] : []
    if (searchContentIds.length === 0) {
      return { contents: [], total: 0 }
    }
  }

  const needInnerJoin = !!contentType
  const selectQuery = needInnerJoin
    ? `*, content:contents!inner (id, type, external_source, content_locales(locale, title, creator, thumbnail_url))`
    : `*, content:contents (id, type, external_source, content_locales(locale, title, creator, thumbnail_url))`

  let query = supabase
    .from('celeb_contents')
    .select(selectQuery, { count: 'exact' })
    .eq('celeb_id', celebId)

  if (contentType) {
    query = query.eq('content.type', contentType)
  }

  if (searchContentIds) {
    query = query.in('content_id', searchContentIds)
  }

  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[getCelebContents] Error:', error)
    throw error
  }

  const contents: CelebContent[] = (data || []).map((item) => {
    const rawContent = item.content as any
    const locales = rawContent?.content_locales || []
    const ko = locales.find((l: any) => l.locale === 'ko')
    const en = locales.find((l: any) => l.locale === 'en')
    return {
      id: item.id,
      content_id: item.content_id,
      status: item.status,
      rating: item.rating,
      review: item.review,
      is_spoiler: item.is_spoiler || false,
      visibility: item.visibility || 'public',
      source_url: item.source_url || null,
      created_at: item.created_at,
      updated_at: item.updated_at,
      content: {
        id: rawContent?.id || '',
        title: ko?.title || en?.title || '',
        type: rawContent?.type || '',
        creator: ko?.creator || en?.creator || null,
        thumbnail_url: ko?.thumbnail_url || en?.thumbnail_url || null,
        external_source: rawContent?.external_source || null,
      },
    }
  })

  return {
    contents,
    total: count || 0,
  }
}
// #endregion

// #region addCelebContent
interface AddCelebContentInput {
  celeb_id: string
  content_id: string
  status: string
  rating?: number
  review?: string
  is_spoiler?: boolean
  source_url?: string
}

export async function addCelebContent(input: AddCelebContentInput): Promise<{ id: string; isExisting?: boolean }> {
  const supabase = await createClient()

  // 현재 관리자 정보 가져오기
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError) throw authError

  // 이미 등록된 콘텐츠인지 확인
  const { data: existing, error: existingError } = await supabase
    .from('celeb_contents')
    .select('id')
    .eq('celeb_id', input.celeb_id)
    .eq('content_id', input.content_id)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing) {
    throw new Error('이미 등록된 콘텐츠입니다.')
  }

  // 없으면 새로 추가
  const { data, error } = await supabase
    .from('celeb_contents')
    .insert({
      celeb_id: input.celeb_id,
      content_id: input.content_id,
      status: input.status,
      rating: input.rating !== undefined ? input.rating : null,
      review: input.review || null,
      is_spoiler: input.is_spoiler || false,
      visibility: 'public',
      contributor_member_id: user?.id || null,
      source_url: input.source_url || null,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath('/celebs/[slug]/contents', 'page')
  // celeb_contents 신규 — 셀럽 서고에 책이 꽂히고 콘텐츠 쪽 보유자 목록도 바뀐다
  await revalidateWebCache([CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS])

  return { id: data.id }
}
// #endregion

// #region updateCelebContent
interface UpdateCelebContentInput {
  id: string
  celeb_id: string
  status?: string
  rating?: number | null
  review?: string | null
  is_spoiler?: boolean
  visibility?: string
  source_url?: string | null
  // contents 테이블 필드
  content_id?: string
  content_type?: string
  content_title?: string
  content_creator?: string | null
  // 콘텐츠 교체 시 새 content_id
  new_content_id?: string
}

export async function updateCelebContent(input: UpdateCelebContentInput): Promise<void> {
  // Admin 클라이언트 사용 (RLS 우회)
  const adminClient = createAdminClient()

  // celeb_contents 테이블 업데이트
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (input.status !== undefined) updateData.status = input.status
  if (input.rating !== undefined) updateData.rating = input.rating
  if (input.review !== undefined) updateData.review = input.review
  if (input.is_spoiler !== undefined) updateData.is_spoiler = input.is_spoiler
  if (input.visibility !== undefined) updateData.visibility = input.visibility
  if (input.source_url !== undefined) updateData.source_url = input.source_url

  // 콘텐츠 교체 시 content_id 업데이트
  if (input.new_content_id !== undefined) {
    updateData.content_id = input.new_content_id
  }

  const { error } = await adminClient.from('celeb_contents').update(updateData).eq('id', input.id)

  if (error) throw error

  // contents 테이블 업데이트 (type만) - 교체가 아닌 경우에만
  if (!input.new_content_id && input.content_id) {
    if (input.content_type !== undefined) {
      const { error: contentError } = await adminClient.from('contents').update({ type: input.content_type }).eq('id', input.content_id)
      if (contentError) throw contentError
    }

    // content_locales 업데이트 (title, creator)
    if (input.content_title !== undefined || input.content_creator !== undefined) {
      const localeUpdate: Record<string, unknown> = {}
      if (input.content_title !== undefined) localeUpdate.title = input.content_title
      if (input.content_creator !== undefined) localeUpdate.creator = input.content_creator
      await adminClient.from('content_locales').upsert({
        content_id: input.content_id,
        locale: 'ko',
        ...localeUpdate,
      }, { onConflict: 'content_id,locale' })
    }
  }

  revalidatePath('/celebs/[slug]/contents', 'page')
  // celeb_contents(감상문·평점) + contents.type + content_locales(제목·저자)
  await revalidateWebCache([CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS])
}
// #endregion

// #region deleteCelebContent
export async function deleteCelebContent(contentId: string, celebId: string): Promise<void> {
  // Admin 클라이언트 사용 (RLS 우회)
  const adminClient = createAdminClient()

  const { error } = await adminClient.from('celeb_contents').delete().eq('id', contentId)

  if (error) throw error

  revalidatePath('/celebs/[slug]/contents', 'page')
  // celeb_contents 삭제 — 셀럽 서고와 콘텐츠 보유자 목록 양쪽에서 빠진다
  await revalidateWebItem(CACHE_TAGS.CELEBS, celebId, [CACHE_TAGS.CONTENTS])
}
// #endregion

// #region getCelebsForTitleEdit - 수식어/직군/감상철학 편집용 셀럽 목록
export interface CelebTitleItem {
  id: string
  nickname: string | null
  avatar_url: string | null
  profession: string | null
  title: string | null
  cultural_journey: string | null
}

export async function getCelebsForTitleEdit(): Promise<CelebTitleItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('celebs')
    .select('id, nickname, avatar_url, profession, title, cultural_journey:consumption_philosophy')
    .eq('publication_status', 'active')
    .order('nickname', { ascending: true })

  if (error) throw error

  return data || []
}

export interface CelebsWithPaginationResponse {
  celebs: CelebTitleItem[]
  total: number
}

export async function getCelebsForJourneyEdit(page: number = 1, limit: number = 50): Promise<CelebsWithPaginationResponse> {
  const supabase = await createClient()
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('celebs')
    .select('id, nickname, avatar_url, profession, title, cultural_journey:consumption_philosophy', { count: 'exact' })
    .eq('publication_status', 'active')
    .order('nickname', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return {
    celebs: data || [],
    total: count || 0,
  }
}
// #endregion

// 명언 편집(getCelebsForQuotesEdit / updateCelebQuotes)은 제거했다.
// 명언은 대사 편집기에서 대사와 함께 저장한다 — dialogues.ts의 saveCelebDialogues가
// lines.quote·lines_en.quote를 한 번에 쓴다. 여기 있던 짝은 ko만 저장했다.

// #region updateCelebTitle - 수식어만 업데이트
export async function updateCelebTitle(celebId: string, title: string | null): Promise<void> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('celebs')
    .update({ title })
    .eq('id', celebId)

  if (error) throw error

  revalidatePath('/celebs')
  revalidatePath('/celebs/titles')
  revalidatePath('/celebs/[slug]', 'page')
  // celebs.title
  await revalidateWebItem(CACHE_TAGS.CELEBS, celebId)
}
// #endregion

// #region updateCelebProfession - 직군만 업데이트
export async function updateCelebProfession(celebId: string, profession: string | null): Promise<void> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('celebs')
    .update({ profession })
    .eq('id', celebId)

  if (error) throw error

  revalidatePath('/celebs')
  revalidatePath('/celebs/professions')
  revalidatePath('/celebs/[slug]', 'page')
  // celebs.profession
  await revalidateWebItem(CACHE_TAGS.CELEBS, celebId)
}
// #endregion

// #region updateCelebJourney - 감상 여정만 업데이트
export async function updateCelebJourney(celebId: string, journey: string | null): Promise<void> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('celebs')
    .update({ consumption_philosophy: journey })
    .eq('id', celebId)

  if (error) throw error

  revalidatePath('/celebs')
  revalidatePath('/celebs/journeys')
  revalidatePath('/celebs/[slug]', 'page')
  // celebs.consumption_philosophy
  await revalidateWebItem(CACHE_TAGS.CELEBS, celebId)
}
// #endregion

// #region setCelebMonologueLock - 가상 독백 확정 잠금 토글
/**
 * celebs.virtual_monologue_locked_at 을 채우거나 비운다.
 * 잠긴 인물의 독백은 DB 트리거(guard_virtual_monologue_lock)가 모든 경로의 UPDATE를 차단한다.
 */
export async function setCelebMonologueLock(
  celebId: string,
  locked: boolean
): Promise<{ locked_at: string | null }> {
  await requireAdmin()
  const supabase = createAdminClient()

  if (locked) {
    const { data: row, error: readError } = await supabase
      .from('celebs')
      .select('virtual_monologue')
      .eq('id', celebId)
      .single()

    if (readError) throw readError
    if (!row?.virtual_monologue?.trim()) {
      throw new Error('독백이 비어 있어 잠글 수 없다')
    }
  }

  const lockedAt = locked ? new Date().toISOString() : null
  const { error } = await supabase
    .from('celebs')
    .update({ virtual_monologue_locked_at: lockedAt })
    .eq('id', celebId)

  if (error) throw error

  revalidatePath('/celebs/[slug]', 'page')
  return { locked_at: lockedAt }
}
// #endregion

// #region getCelebStats - 셀럽 통계 조회
export interface CelebStats {
  totalCelebs: number
  activeCelebs: number
  uniqueProfessions: number
  uniqueNationalities: number
  professionDistribution: { profession: string; count: number }[]
  // 상세 화면 주소가 slug로 잡히므로(/celebs/[slug]) 목록마다 slug를 함께 싣는다.
  topFollowerCelebs: { id: string; slug: string | null; nickname: string; profession: string | null; follower_count: number }[]
  topContentCelebs: { id: string; slug: string | null; nickname: string; profession: string | null; content_count: number }[]
  recentCelebs: { id: string; slug: string | null; nickname: string; profession: string | null; created_at: string }[]
}

export async function getCelebStats(): Promise<CelebStats> {
  const supabase = await createClient()

  // 기본 통계
  const { data: basicStats, error: basicStatsError } = await supabase
    .from('celebs')
    .select('id, status:publication_status, profession, nationality')

  if (basicStatsError) throw basicStatsError

  const totalCelebs = basicStats?.length || 0
  const activeCelebs = basicStats?.filter((c) => c.status === 'active').length || 0
  const professions = new Set(basicStats?.filter((c) => c.status === 'active').map((c) => c.profession).filter(Boolean))
  const nationalities = new Set(basicStats?.filter((c) => c.status === 'active').map((c) => c.nationality).filter(Boolean))

  // 직업별 분포
  const professionCount = basicStats
    ?.filter((c) => c.status === 'active')
    .reduce((acc, c) => {
      const prof = c.profession || 'unknown'
      acc[prof] = (acc[prof] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

  const professionDistribution = Object.entries(professionCount)
    .map(([profession, count]) => ({ profession, count }))
    .sort((a, b) => b.count - a.count)

  // 상위 팔로워 셀럽
  const { data: followerData, error: followerError } = await supabase
    .from('celebs')
    .select('id, slug, nickname, profession, celeb_metrics!celeb_metrics_celeb_id_fkey(follower_count)')
    .eq('publication_status', 'active')
    .order('follower_count', { referencedTable: 'celeb_metrics', ascending: false })
    .limit(10)

  if (followerError) throw followerError

  const topFollowerCelebs = (followerData || []).map((c) => {
    const social = Array.isArray(c.celeb_metrics) ? c.celeb_metrics[0] : c.celeb_metrics
    return {
      id: c.id,
      slug: c.slug || null,
      nickname: c.nickname || '',
      profession: c.profession,
      follower_count: social?.follower_count || 0,
    }
  })

  // 상위 콘텐츠 셀럽 (별도 쿼리)
  const activeCelebIds = basicStats?.filter((c) => c.status === 'active').map((c) => c.id) || []
  const { data: contentData, error: contentError } = await supabase
    .from('celeb_contents')
    .select('celeb_id')
    .in('celeb_id', activeCelebIds)

  if (contentError) throw contentError

  const contentCountMap = (contentData || []).reduce((acc, item) => {
    acc[item.celeb_id] = (acc[item.celeb_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const celebContentList = activeCelebIds.map((id) => ({
    id,
    count: contentCountMap[id] || 0,
  }))
  celebContentList.sort((a, b) => b.count - a.count)
  const top10ContentIds = celebContentList.slice(0, 10).map((c) => c.id)

  const { data: topContentProfiles, error: topContentError } = await supabase
    .from('celebs')
    .select('id, slug, nickname, profession')
    .in('id', top10ContentIds)

  if (topContentError) throw topContentError
  const profileMap = new Map((topContentProfiles || []).map((p) => [p.id, p]))
  const topContentCelebs = top10ContentIds.map((id) => {
    const profile = profileMap.get(id)
    return {
      id,
      slug: profile?.slug || null,
      nickname: profile?.nickname || '',
      profession: profile?.profession || null,
      content_count: contentCountMap[id] || 0,
    }
  })

  // 최근 등록 셀럽
  const { data: recentData, error: recentError } = await supabase
    .from('celebs')
    .select('id, slug, nickname, profession, created_at')
    .eq('publication_status', 'active')
    .order('created_at', { ascending: false })
    .limit(10)

  if (recentError) throw recentError
  const recentCelebs = (recentData || []).map((c) => ({
    id: c.id,
    slug: c.slug || null,
    nickname: c.nickname || '',
    profession: c.profession,
    created_at: c.created_at,
  }))

  return {
    totalCelebs,
    activeCelebs,
    uniqueProfessions: professions.size,
    uniqueNationalities: nationalities.size,
    professionDistribution,
    topFollowerCelebs,
    topContentCelebs,
    recentCelebs,
  }
}
// #endregion

// #region exportCelebContents - 콘텐츠 추출 (JSON 형식)
export interface ExportedContent {
  title: string
  body: string
  source: string
}

export async function exportCelebContents(
  celebId: string,
  contentType?: string
): Promise<{ success: boolean; items?: ExportedContent[]; error?: string }> {
  const supabase = await createClient()

  let query = supabase
    .from('celeb_contents')
    .select(`
      review,
      source_url,
      content:contents (
        type,
        content_locales(locale, title, creator)
      )
    `)
    .eq('celeb_id', celebId)
    .order('updated_at', { ascending: false })

  if (contentType && contentType !== 'ALL') {
    query = query.eq('contents.type', contentType)
  }

  const { data, error } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  // content가 null인 항목(타입 필터링으로 제외된 항목) 제거
  const filteredData = (data || []).filter((item) => item.content !== null)

  const items: ExportedContent[] = filteredData.map((item) => {
    const contentData = Array.isArray(item.content) ? item.content[0] : item.content
    const raw = contentData as { type: string; content_locales: { locale: string; title: string; creator: string | null }[] }
    const ko = raw.content_locales?.find((l) => l.locale === 'ko')
    const en = raw.content_locales?.find((l) => l.locale === 'en')
    const contentTitle = ko?.title || en?.title || ''
    const creator = ko?.creator || en?.creator || null
    const title = creator ? `${contentTitle}(${creator})` : contentTitle

    return {
      title,
      body: item.review || '',
      source: item.source_url || '',
    }
  })

  return { success: true, items }
}
// #endregion
