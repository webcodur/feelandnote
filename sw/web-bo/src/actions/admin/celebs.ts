'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { type GeneratedInfluence, type GeneratedCelebProfile } from '@feelandnote/ai-services/celeb-profile'
import { notifyIndexNow } from '@/lib/indexnow'

// #region Types
export interface Celeb {
  id: string
  slug: string | null
  nickname: string | null
  avatar_url: string | null
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
  follower_count: number
  influence_total: number
}

export interface CelebsResponse {
  celebs: Celeb[]
  total: number
}

interface GetCelebsParams {
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'inactive' | 'suspended' | 'all'
  profession?: string
  tier?: 'full' | 'light' | 'all'
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
  is_verified?: boolean
  status?: 'active' | 'inactive' | 'suspended'
  celeb_tier?: 'full' | 'light'
  influence?: GeneratedInfluence
}

type CelebListRow = {
  id: string
  slug: string | null
  nickname: string | null
  avatar_url: string | null
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
  created_at: string | null
  user_social?: { follower_count?: number | null }[] | { follower_count?: number | null } | null
  celeb_influence?: { total_score?: number | null }[] | { total_score?: number | null } | null
}

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function mapCelebListRow(row: CelebListRow, contentCount = 0): Celeb {
  const social = getSingleRelation(row.user_social)
  const influence = getSingleRelation(row.celeb_influence)

  return {
    id: row.id,
    slug: row.slug || null,
    nickname: row.nickname,
    avatar_url: row.avatar_url,
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
    content_count: contentCount,
    follower_count: social?.follower_count || 0,
    influence_total: influence?.total_score || 0,
  }
}

async function getCelebContentCounts(supabase: ReturnType<typeof createAdminClient>, celebIds: string[]) {
  if (celebIds.length === 0) return new Map<string, number>()

  const { data } = await supabase
    .from('user_contents')
    .select('user_id')
    .in('user_id', celebIds)

  const counts = new Map<string, number>()
  data?.forEach((row) => {
    counts.set(row.user_id, (counts.get(row.user_id) || 0) + 1)
  })
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
  params: Pick<GetCelebsParams, 'search' | 'status' | 'profession' | 'tier'>,
  select: string,
  options?: { count?: 'exact'; head?: boolean }
) {
  const { search, status, profession, tier } = params

  let query = supabase
    .from('profiles')
    .select(select, options)
    .eq('profile_type', 'CELEB')

  if (status && status !== 'all') {
    query = query.eq('status', status)
  } else {
    query = query.in('status', ['active', 'inactive', 'suspended'])
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

  return query
}

async function getCelebsByDirectQuery(params: GetCelebsParams = {}): Promise<CelebsResponse> {
  const { page = 1, limit = 20, search, status, profession, tier, sort = 'created_at', sortOrder = 'desc' } = params
  const supabase = createAdminClient()
  const offset = (page - 1) * limit
  const filters = { search, status, profession, tier }
  const selectFields = `
    id, slug, nickname, avatar_url, profession, title, nationality, gender,
    birth_date, death_date, bio, cultural_journey,
    is_verified, status, celeb_tier, claimed_by, created_at,
    user_social (follower_count),
    celeb_influence (total_score)
  `

  const { count, error: countError } = await buildCelebListQuery(supabase, filters, 'id', { count: 'exact', head: true })

  if (countError) {
    console.error('[getCelebsByDirectQuery] count 조회 실패:', countError)
    throw countError
  }

  if (!count) {
    return { celebs: [], total: 0 }
  }

  const rows: CelebListRow[] = []
  const batchSize = 1000

  for (let batchOffset = 0; batchOffset < count; batchOffset += batchSize) {
    const batchEnd = Math.min(batchOffset + batchSize - 1, count - 1)
    const { data: batch, error: batchError } = await buildCelebListQuery(supabase, filters, selectFields)
      .range(batchOffset, batchEnd)

    if (batchError) {
      console.error('[getCelebsByDirectQuery] 배치 조회 실패:', batchError)
      throw batchError
    }

    rows.push(...((batch || []) as unknown as CelebListRow[]))
  }

  const contentCounts = await getCelebContentCounts(supabase, rows.map((row) => row.id))
  const celebs = rows.map((row) => mapCelebListRow(row, contentCounts.get(row.id) || 0))

  sortCelebs(celebs, sort, sortOrder)

  return {
    celebs: celebs.slice(offset, offset + limit),
    total: count || 0,
  }
}

// #endregion

// #region getCelebs
export async function getCelebs(params: GetCelebsParams = {}): Promise<CelebsResponse> {
  const { page = 1, limit = 20, search, status, profession, tier, sort = 'created_at', sortOrder = 'desc' } = params
  const rpcUnsupportedSorts = ['avatar_url', 'title', 'gender', 'celeb_tier']
  const needsExactFiltering = rpcUnsupportedSorts.includes(sort) || status === 'inactive' || status === 'suspended' || (tier && tier !== 'all')

  if (needsExactFiltering) {
    return getCelebsByDirectQuery({ page, limit, search, status, profession, tier, sort, sortOrder })
  }

  const supabase = createAdminClient()
  const offset = (page - 1) * limit

  // avatar_url 정렬: RPC 미지원 → 직접 쿼리
  if (sort === 'avatar_url') {
    return getCelebsByAvatarSort({ page, limit, search, status, profession, tier, sortOrder })
  }

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
  const { data: countData } = await supabase.rpc('count_celebs_filtered', {
    p_profession: profession && profession !== 'all' ? profession : null,
    p_nationality: null,
    p_content_type: null,
    p_search: search || null,
    p_tag_id: null,
    p_min_content_count: 0,
    p_gender: null,
    p_include_inactive: includeInactive,
    p_celeb_tier: null,
  })
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
    p_tag_id: null,
    p_min_content_count: 0,
    p_gender: null,
    p_include_inactive: includeInactive,
    p_celeb_tier: null,
  })

  if (error) {
    console.error('[getCelebs] RPC 조회 실패:', error.message, error.code, error.details)
    throw error
  }

  let celebs: Celeb[] = (data || []).map((celeb: any) => ({
    id: celeb.id,
    slug: celeb.slug || null,
    nickname: celeb.nickname,
    avatar_url: celeb.avatar_url,
    profession: celeb.profession,
    title: celeb.title,
    nationality: celeb.nationality,
    gender: celeb.gender ?? null,
    birth_date: celeb.birth_date,
    death_date: celeb.death_date,
    bio: celeb.bio,
    cultural_journey: celeb.cultural_journey,
    is_verified: celeb.is_verified,
    status: celeb.status,
    celeb_tier: celeb.celeb_tier || 'full',
    claimed_by: celeb.claimed_by,
    created_at: celeb.created_at || '',
    content_count: celeb.content_count || 0,
    follower_count: celeb.follower_count || 0,
    influence_total: celeb.total_score || 0,
  }))

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

// #region getCelebsByAvatarSort
async function getCelebsByAvatarSort(params: Omit<GetCelebsParams, 'sort'>): Promise<CelebsResponse> {
  const { page = 1, limit = 20, search, status, profession, tier, sortOrder = 'desc' } = params
  const supabase = createAdminClient()
  const offset = (page - 1) * limit

  let query = supabase
    .from('profiles')
    .select(
      '*, user_social(follower_count), celeb_influence(total_score)',
      { count: 'exact' }
    )
    .eq('profile_type', 'CELEB')

  if (status && status !== 'all') {
    query = query.eq('status', status)
  } else {
    query = query.in('status', ['active', 'inactive', 'suspended'])
  }

  if (profession && profession !== 'all') {
    query = query.eq('profession', profession)
  }

  if (search) {
    query = query.or(`nickname.ilike.%${search}%,title.ilike.%${search}%`)
  }

  if (tier && tier !== 'all') {
    query = query.eq('celeb_tier', tier)
  }

  // nullsFirst: true → null 먼저 (이미지 없는 것 먼저 = asc)
  // nullsFirst: false → null 나중 (이미지 있는 것 먼저 = desc)
  const { data, error, count } = await query
    .order('avatar_url', { ascending: sortOrder === 'asc', nullsFirst: sortOrder === 'asc' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  const celebs: Celeb[] = (data || []).map((row: any) => {
    const social = Array.isArray(row.user_social) ? row.user_social[0] : row.user_social
    const influence = Array.isArray(row.celeb_influence) ? row.celeb_influence[0] : row.celeb_influence
    return {
      id: row.id,
      slug: row.slug || null,
      nickname: row.nickname,
      avatar_url: row.avatar_url,
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
      content_count: 0,
      follower_count: social?.follower_count || 0,
      influence_total: influence?.total_score || 0,
    }
  })

  return { celebs, total: count || 0 }
}
// #endregion

// #region getCeleb
export async function getCeleb(celebId: string): Promise<Celeb | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      *,
      user_social (follower_count),
      celeb_influence (total_score)
    `
    )
    .eq('id', celebId)
    .eq('profile_type', 'CELEB')
    .single()

  if (error) return null

  const { count: contentCount } = await supabase
    .from('user_contents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', celebId)

  return {
    id: data.id,
    slug: data.slug || null,
    nickname: data.nickname,
    avatar_url: data.avatar_url,
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
    influence_total: data.celeb_influence?.total_score || 0,
    content_count: contentCount || 0,
    follower_count: data.user_social?.follower_count || 0,
  }
}
// #endregion

// #region createCeleb
export async function createCeleb(input: CreateCelebInput): Promise<{ id: string }> {
  // Admin 클라이언트 사용 (RLS 우회 필요)
  const adminClient = createAdminClient()

  // 닉네임 중복 체크
  const { data: existing } = await adminClient
    .from('profiles')
    .select('id')
    .eq('profile_type', 'CELEB')
    .eq('nickname', input.nickname.trim())
    .neq('status', 'deleted')
    .maybeSingle()

  if (existing) {
    throw new Error('이미 동일한 이름의 셀럽이 존재합니다.')
  }

  // 더미 이메일 생성 (auth.users FK 제약 때문에 필요)
  const dummyId = crypto.randomUUID()
  const dummyEmail = `celeb_${dummyId}@feelandnote.local`
  const dummyPassword = crypto.randomUUID() + crypto.randomUUID()

  // Supabase Admin API로 더미 auth user 생성
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: dummyEmail,
    password: dummyPassword,
    email_confirm: true,
  })

  if (authError) throw authError

  const userId = authData.user.id

  // profiles 테이블에 셀럽 정보 업데이트
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      nickname: input.nickname,
      nickname_en: input.nickname_en || null,
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
      profile_type: 'CELEB',
      status: input.status || 'suspended',
    })
    .eq('id', userId)

  if (profileError) throw profileError

  // user_social 초기화
  const { error: socialError } = await adminClient.from('user_social').upsert({
    user_id: userId,
    follower_count: 0,
    following_count: 0,
    friend_count: 0,
    influence: 0,
  })

  if (socialError) throw socialError

  // user_scores 초기화
  const { error: scoresError } = await adminClient.from('user_scores').upsert({
    user_id: userId,
    activity_score: 0,
    title_bonus: 0,
    total_score: 0,
  })

  if (scoresError) throw scoresError

  // 영향력 저장 (AI 생성된 경우)
  if (input.influence) {
    const inf = input.influence
    const { error: influenceError } = await adminClient.from('celeb_influence').upsert({
      celeb_id: userId,
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

  return { id: userId }
}
// #endregion

// #region updateCeleb
export async function updateCeleb(input: UpdateCelebInput): Promise<void> {
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
  if (input.is_verified !== undefined) updateData.is_verified = input.is_verified
  if (input.status !== undefined) updateData.status = input.status
  if (input.celeb_tier !== undefined) updateData.celeb_tier = input.celeb_tier

  const { error } = await adminClient
    .from('profiles')
    .update(updateData)
    .eq('id', input.id)
    .eq('profile_type', 'CELEB')

  if (error) throw error

  // quotes → celeb_dialogues.lines.quote 저장 (SSoT)
  if (input.quotes !== undefined || input.quotes_en !== undefined) {
    const { data: existing } = await adminClient
      .from('celeb_dialogues')
      .select('lines, lines_en')
      .eq('celeb_id', input.id)
      .maybeSingle()

    const updates: Record<string, any> = { celeb_id: input.id }
    if (input.quotes !== undefined) {
      updates.lines = { ...((existing?.lines as Record<string, any>) ?? {}), quote: input.quotes ?? '' }
    }
    if (input.quotes_en !== undefined) {
      updates.lines_en = { ...((existing?.lines_en as Record<string, any>) ?? {}), quote: input.quotes_en ?? '' }
    }
    await adminClient.from('celeb_dialogues').upsert(updates, { onConflict: 'celeb_id' })
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

  revalidatePath('/celebs')
  revalidatePath(`/celebs/${input.id}`)
  revalidatePath(`/members/${input.id}`)

  // active 셀럽 정보 변경 시 IndexNow 색인 요청
  const { data: profile } = await adminClient
    .from('profiles')
    .select('slug, status')
    .eq('id', input.id)
    .single()
  if (profile?.status === 'active' && profile?.slug) {
    notifyIndexNow([`/celeb/${profile.slug}`])
  }
}
// #endregion

// #region toggleCelebTier
export async function toggleCelebTier(celebId: string, currentTier: string): Promise<void> {
  const supabase = await createClient()
  const newTier = currentTier === 'light' ? 'full' : 'light'

  const { error } = await supabase
    .from('profiles')
    .update({ celeb_tier: newTier })
    .eq('id', celebId)
    .eq('profile_type', 'CELEB')

  if (error) throw error

  revalidatePath('/celebs')
}
// #endregion

// #region toggleCelebStatus
export async function toggleCelebStatus(celebId: string, currentStatus: string): Promise<string> {
  const supabase = await createClient()
  const cycle: Record<string, string> = {
    active: 'inactive',
    inactive: 'active',
    suspended: 'active',
  }
  const newStatus = cycle[currentStatus] || 'active'

  const { error } = await supabase
    .from('profiles')
    .update({ status: newStatus })
    .eq('id', celebId)
    .eq('profile_type', 'CELEB')

  if (error) throw error

  // active 전환 시 IndexNow 색인 요청
  if (newStatus === 'active') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('slug')
      .eq('id', celebId)
      .single()
    if (profile?.slug) {
      notifyIndexNow([`/celeb/${profile.slug}`])
    }
  }

  revalidatePath('/celebs')
  return newStatus
}
// #endregion

// #region deleteCeleb
export async function deleteCeleb(celebId: string): Promise<void> {
  const supabase = await createClient()

  // 소프트 삭제 (status를 'deleted'로 변경)
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'deleted' })
    .eq('id', celebId)
    .eq('profile_type', 'CELEB')

  if (error) throw error

  revalidatePath('/celebs')
  revalidatePath('/members')
  revalidatePath('/members/titles')
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
    const { data: matchIds } = await supabase
      .from('content_locales')
      .select('content_id')
      .or(`title.ilike.${searchTerm},creator.ilike.${searchTerm}`)
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
    .from('user_contents')
    .select(selectQuery, { count: 'exact' })
    .eq('user_id', celebId)

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
  } = await supabase.auth.getUser()

  // 이미 등록된 콘텐츠인지 확인
  const { data: existing } = await supabase
    .from('user_contents')
    .select('id')
    .eq('user_id', input.celeb_id)
    .eq('content_id', input.content_id)
    .maybeSingle()

  if (existing) {
    throw new Error('이미 등록된 콘텐츠입니다.')
  }

  // 없으면 새로 추가
  const { data, error } = await supabase
    .from('user_contents')
    .insert({
      user_id: input.celeb_id,
      content_id: input.content_id,
      status: input.status,
      rating: input.rating !== undefined ? input.rating : null,
      review: input.review || null,
      is_spoiler: input.is_spoiler || false,
      visibility: 'public',
      contributor_id: user?.id || null,
      source_url: input.source_url || null,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(`/celebs/${input.celeb_id}/contents`)

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

  // user_contents 테이블 업데이트
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

  const { error } = await adminClient.from('user_contents').update(updateData).eq('id', input.id)

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

  revalidatePath(`/celebs/${input.celeb_id}/contents`)
}
// #endregion

// #region deleteCelebContent
export async function deleteCelebContent(contentId: string, celebId: string): Promise<void> {
  // Admin 클라이언트 사용 (RLS 우회)
  const adminClient = createAdminClient()

  const { error } = await adminClient.from('user_contents').delete().eq('id', contentId)

  if (error) throw error

  revalidatePath(`/celebs/${celebId}/contents`)
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
    .from('profiles')
    .select('id, nickname, avatar_url, profession, title, cultural_journey')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
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
    .from('profiles')
    .select('id, nickname, avatar_url, profession, title, cultural_journey', { count: 'exact' })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .order('nickname', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw error

  return {
    celebs: data || [],
    total: count || 0,
  }
}
// #endregion

// #region getCelebsForQuotesEdit / updateCelebQuotes - 명언 편집
export interface CelebQuotesItem {
  id: string
  nickname: string | null
  avatar_url: string | null
  profession: string | null
  quotes: string | null
  quotes_en: string | null
}

export async function getCelebsForQuotesEdit(): Promise<CelebQuotesItem[]> {
  const supabase = await createClient()

  const [profilesResult, dialoguesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nickname, avatar_url, profession')
      .eq('profile_type', 'CELEB')
      .eq('status', 'active')
      .order('nickname', { ascending: true }),
    supabase
      .from('celeb_dialogues')
      .select('celeb_id, lines, lines_en'),
  ])

  if (profilesResult.error) throw profilesResult.error

  const quoteMap = new Map<string, { quotes: string | null; quotes_en: string | null }>()
  for (const d of dialoguesResult.data ?? []) {
    quoteMap.set(d.celeb_id, {
      quotes: (d.lines as any)?.quote ?? null,
      quotes_en: (d.lines_en as any)?.quote ?? null,
    })
  }

  return (profilesResult.data || []).map(p => ({
    ...p,
    quotes: quoteMap.get(p.id)?.quotes ?? null,
    quotes_en: quoteMap.get(p.id)?.quotes_en ?? null,
  }))
}

export async function updateCelebQuotes(celebId: string, quotes: string | null): Promise<void> {
  const supabase = createAdminClient()

  // celeb_dialogues.lines.quote 업데이트
  const { data: existing } = await supabase
    .from('celeb_dialogues')
    .select('lines')
    .eq('celeb_id', celebId)
    .maybeSingle()

  const updatedLines = { ...(existing?.lines as Record<string, any> ?? {}), quote: quotes ?? '' }
  const { error } = await supabase
    .from('celeb_dialogues')
    .upsert({ celeb_id: celebId, lines: updatedLines }, { onConflict: 'celeb_id' })

  if (error) throw error

  revalidatePath('/celebs')
  revalidatePath('/celebs/quotes')
  revalidatePath(`/celebs/${celebId}`)
}
// #endregion

// #region updateCelebTitle - 수식어만 업데이트
export async function updateCelebTitle(celebId: string, title: string | null): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ title })
    .eq('id', celebId)
    .eq('profile_type', 'CELEB')

  if (error) throw error

  revalidatePath('/members')
  revalidatePath('/members/titles')
  revalidatePath(`/members/${celebId}`)
}
// #endregion

// #region updateCelebProfession - 직군만 업데이트
export async function updateCelebProfession(celebId: string, profession: string | null): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ profession })
    .eq('id', celebId)
    .eq('profile_type', 'CELEB')

  if (error) throw error

  revalidatePath('/members')
  revalidatePath('/members/professions')
  revalidatePath(`/members/${celebId}`)
}
// #endregion

// #region updateCelebJourney - 감상 여정만 업데이트
export async function updateCelebJourney(celebId: string, journey: string | null): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ cultural_journey: journey })
    .eq('id', celebId)
    .eq('profile_type', 'CELEB')

  if (error) throw error

  revalidatePath('/members')
  revalidatePath('/members/journeys')
  revalidatePath(`/members/${celebId}`)
}
// #endregion

// #region getCelebStats - 셀럽 통계 조회
export interface CelebStats {
  totalCelebs: number
  activeCelebs: number
  uniqueProfessions: number
  uniqueNationalities: number
  professionDistribution: { profession: string; count: number }[]
  topFollowerCelebs: { id: string; nickname: string; profession: string | null; follower_count: number }[]
  topContentCelebs: { id: string; nickname: string; profession: string | null; content_count: number }[]
  recentCelebs: { id: string; nickname: string; profession: string | null; created_at: string }[]
}

export async function getCelebStats(): Promise<CelebStats> {
  const supabase = await createClient()

  // 기본 통계
  const { data: basicStats } = await supabase
    .from('profiles')
    .select('id, status, profession, nationality')
    .eq('profile_type', 'CELEB')

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
  const { data: followerData } = await supabase
    .from('profiles')
    .select('id, nickname, profession, user_social(follower_count)')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .order('user_social(follower_count)', { ascending: false })
    .limit(10)

  const topFollowerCelebs = (followerData || []).map((c) => {
    const social = Array.isArray(c.user_social) ? c.user_social[0] : c.user_social
    return {
      id: c.id,
      nickname: c.nickname || '',
      profession: c.profession,
      follower_count: social?.follower_count || 0,
    }
  })

  // 상위 콘텐츠 셀럽 (별도 쿼리)
  const activeCelebIds = basicStats?.filter((c) => c.status === 'active').map((c) => c.id) || []
  const { data: contentData } = await supabase
    .from('user_contents')
    .select('user_id')
    .in('user_id', activeCelebIds)

  const contentCountMap = (contentData || []).reduce((acc, item) => {
    acc[item.user_id] = (acc[item.user_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const celebContentList = activeCelebIds.map((id) => ({
    id,
    count: contentCountMap[id] || 0,
  }))
  celebContentList.sort((a, b) => b.count - a.count)
  const top10ContentIds = celebContentList.slice(0, 10).map((c) => c.id)

  const { data: topContentProfiles } = await supabase
    .from('profiles')
    .select('id, nickname, profession')
    .in('id', top10ContentIds)

  const profileMap = new Map((topContentProfiles || []).map((p) => [p.id, p]))
  const topContentCelebs = top10ContentIds.map((id) => {
    const profile = profileMap.get(id)
    return {
      id,
      nickname: profile?.nickname || '',
      profession: profile?.profession || null,
      content_count: contentCountMap[id] || 0,
    }
  })

  // 최근 등록 셀럽
  const { data: recentData } = await supabase
    .from('profiles')
    .select('id, nickname, profession, created_at')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(10)

  const recentCelebs = (recentData || []).map((c) => ({
    id: c.id,
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
    .from('user_contents')
    .select(`
      review,
      source_url,
      content:contents (
        type,
        content_locales(locale, title, creator)
      )
    `)
    .eq('user_id', celebId)
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

