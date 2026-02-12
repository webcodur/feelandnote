'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { generateCelebProfile as generateCelebProfileApi, generateCelebInfluence as generateCelebInfluenceApi, type GeneratedInfluence, type GeneratedCelebProfile } from '@feelandnote/ai-services/celeb-profile'
import { getBestAvailableKey, getApiKeyById, recordApiKeyUsage } from './api-keys'

// #region Types
export interface Celeb {
  id: string
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
  quotes: string | null
  consumption_philosophy: string | null
  is_verified: boolean | null
  status: string
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
  status?: 'active' | 'suspended' | 'all'
  profession?: string
  sort?: string
  sortOrder?: 'asc' | 'desc'
}

interface CreateCelebInput {
  nickname: string
  profession?: string
  title?: string
  nationality?: string
  gender?: boolean | null
  birth_date?: string
  death_date?: string
  bio?: string
  quotes?: string
  consumption_philosophy?: string
  avatar_url?: string
  portrait_url?: string
  is_verified?: boolean
  status?: 'active' | 'suspended'
  influence?: GeneratedInfluence
}

interface UpdateCelebInput {
  id: string
  nickname?: string
  profession?: string
  title?: string
  nationality?: string
  gender?: boolean | null
  birth_date?: string
  death_date?: string
  bio?: string
  quotes?: string
  consumption_philosophy?: string
  avatar_url?: string
  portrait_url?: string
  is_verified?: boolean
  status?: 'active' | 'suspended'
  influence?: GeneratedInfluence
}

interface GenerateProfileInput {
  name: string
  description: string
  selectedKeyId?: string
}

interface GenerateProfileResult {
  success: boolean
  profile?: GeneratedCelebProfile
  error?: string
}

interface GenerateInfluenceResult {
  success: boolean
  influence?: GeneratedInfluence
  error?: string
}
// #endregion

// #region getCelebs
export async function getCelebs(params: GetCelebsParams = {}): Promise<CelebsResponse> {
  const { page = 1, limit = 20, search, status, profession, sort = 'created_at', sortOrder = 'desc' } = params
  const supabase = createAdminClient()
  const offset = (page - 1) * limit

  // RPC 함수 사용 (프로덕션과 동일한 방식)
  const sortByMap: Record<string, string> = {
    content_count: 'content_count',
    follower_count: 'follower',
    influence_total: 'influence',
    nickname: 'name_asc',
    created_at: 'content_count', // 기본 정렬
  }

  const rpcSortBy = sortByMap[sort] || 'content_count'

  // status 필터: 'all'이면 모두, 아니면 active만 (RPC는 active/inactive만 구분)
  const includeInactive = !status || status === 'all'

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
  })
  const total = countData ?? 0

  // 오름차순일 때 오프셋 반대로 계산 (RPC는 항상 DESC 정렬)
  const actualOffset = sortOrder === 'asc'
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
  })

  if (error) {
    console.error('[getCelebs] RPC 조회 실패:', error)
    throw error
  }

  let celebs: Celeb[] = (data || []).map((celeb: any) => ({
    id: celeb.id,
    nickname: celeb.nickname,
    avatar_url: celeb.avatar_url,
    portrait_url: celeb.portrait_url,
    profession: celeb.profession,
    title: celeb.title,
    nationality: celeb.nationality,
    gender: null, // RPC 함수에 gender 필드 없음
    birth_date: celeb.birth_date,
    death_date: celeb.death_date,
    bio: celeb.bio,
    quotes: celeb.quotes,
    consumption_philosophy: celeb.consumption_philosophy,
    is_verified: celeb.is_verified,
    status: 'active', // RPC 함수에 status 필드 없음
    claimed_by: celeb.claimed_by,
    created_at: '', // RPC 함수에 created_at 필드 없음
    content_count: celeb.content_count || 0,
    follower_count: celeb.follower_count || 0,
    influence_total: celeb.total_score || 0,
  }))

  // 오름차순일 때 결과 뒤집기 (RPC는 항상 DESC 정렬)
  if (sortOrder === 'asc' && rpcSortBy !== 'name_asc') {
    celebs.reverse()
  }

  return {
    celebs,
    total,
  }
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
    quotes: data.quotes,
    consumption_philosophy: data.consumption_philosophy,
    is_verified: data.is_verified,
    status: data.status || 'active',
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
      profession: input.profession || null,
      title: input.title || null,
      nationality: input.nationality || null,
      gender: input.gender ?? null,
      birth_date: input.birth_date || null,
      death_date: input.death_date || null,
      bio: input.bio || null,
      quotes: input.quotes || null,
      consumption_philosophy: input.consumption_philosophy || null,
      avatar_url: input.avatar_url || null,
      portrait_url: input.portrait_url || null,
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
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}

  if (input.nickname !== undefined) updateData.nickname = input.nickname
  if (input.profession !== undefined) updateData.profession = input.profession
  if (input.title !== undefined) updateData.title = input.title
  if (input.nationality !== undefined) updateData.nationality = input.nationality
  if (input.gender !== undefined) updateData.gender = input.gender
  if (input.birth_date !== undefined) updateData.birth_date = input.birth_date
  if (input.death_date !== undefined) updateData.death_date = input.death_date
  if (input.bio !== undefined) updateData.bio = input.bio
  if (input.quotes !== undefined) updateData.quotes = input.quotes
  if (input.consumption_philosophy !== undefined) updateData.consumption_philosophy = input.consumption_philosophy
  if (input.avatar_url !== undefined) updateData.avatar_url = input.avatar_url
  if (input.portrait_url !== undefined) updateData.portrait_url = input.portrait_url
  if (input.is_verified !== undefined) updateData.is_verified = input.is_verified
  if (input.status !== undefined) updateData.status = input.status

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', input.id)
    .eq('profile_type', 'CELEB')

  if (error) throw error

  // 영향력 저장
  if (input.influence) {
    const adminClient = createAdminClient()
    const inf = input.influence
    const { error: influenceError } = await adminClient.from('celeb_influence').upsert({
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
}
// #endregion

// #region generateCelebProfile
export async function generateCelebProfile(input: GenerateProfileInput): Promise<GenerateProfileResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '인증이 필요합니다.' }
  }

  // API 키 가져오기
  let apiKeyRecord
  if (input.selectedKeyId) {
    const result = await getApiKeyById(input.selectedKeyId)
    if (result.success && result.data) {
      apiKeyRecord = result.data
    }
  }

  if (!apiKeyRecord) {
    const result = await getBestAvailableKey()
    if (!result.success || !result.data) {
      return { success: false, error: result.error || '사용 가능한 API 키가 없습니다.' }
    }
    apiKeyRecord = result.data
  }

  // Gemini 호출 - 기본 프로필만 생성
  const result = await generateCelebProfileApi(apiKeyRecord.api_key, {
    name: input.name,
    description: input.description,
  })

  // 사용 기록
  const is429 = result.error?.includes('429') || result.error?.includes('quota')
  await recordApiKeyUsage({
    api_key_id: apiKeyRecord.id,
    action_type: 'celeb_profile',
    success: result.success,
    error_code: is429 ? '429' : result.error ? 'ERROR' : undefined,
  })

  if (!result.success || !result.profile) {
    return { success: false, error: result.error || 'AI 프로필 생성에 실패했습니다.' }
  }

  return { success: true, profile: result.profile }
}
// #endregion

// #region generateCelebInfluence
export async function generateCelebInfluence(input: GenerateProfileInput): Promise<GenerateInfluenceResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '인증이 필요합니다.' }
  }

  // API 키 가져오기
  let apiKeyRecord
  if (input.selectedKeyId) {
    const result = await getApiKeyById(input.selectedKeyId)
    if (result.success && result.data) {
      apiKeyRecord = result.data
    }
  }

  if (!apiKeyRecord) {
    const result = await getBestAvailableKey()
    if (!result.success || !result.data) {
      return { success: false, error: result.error || '사용 가능한 API 키가 없습니다.' }
    }
    apiKeyRecord = result.data
  }

  // Gemini 호출 - 영향력만 생성
  const result = await generateCelebInfluenceApi(apiKeyRecord.api_key, {
    name: input.name,
    description: input.description,
  })

  // 사용 기록
  const is429 = result.error?.includes('429') || result.error?.includes('quota')
  await recordApiKeyUsage({
    api_key_id: apiKeyRecord.id,
    action_type: 'celeb_influence',
    success: result.success,
    error_code: is429 ? '429' : result.error ? 'ERROR' : undefined,
  })

  if (!result.success || !result.influence) {
    return { success: false, error: result.error || 'AI 영향력 생성에 실패했습니다.' }
  }

  return { success: true, influence: result.influence }
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

  // 검색어 또는 타입 필터가 있으면 !inner join 사용
  const needInnerJoin = contentType || search
  const selectQuery = needInnerJoin
    ? `*, content:contents!inner (id, title, type, creator, thumbnail_url, external_source)`
    : `*, content:contents (id, title, type, creator, thumbnail_url, external_source)`

  let query = supabase
    .from('user_contents')
    .select(selectQuery, { count: 'exact' })
    .eq('user_id', celebId)

  if (contentType) {
    query = query.eq('content.type', contentType)
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,creator.ilike.%${search}%`, { referencedTable: 'contents' })
  }

  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[getCelebContents] Error:', error)
    throw error
  }

  const contents: CelebContent[] = (data || []).map((item) => ({
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
    content: item.content,
  }))

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

  // contents 테이블 업데이트 (type, title, creator) - 교체가 아닌 경우에만
  if (!input.new_content_id && input.content_id && (input.content_type !== undefined || input.content_title !== undefined || input.content_creator !== undefined)) {
    const contentUpdateData: Record<string, unknown> = {}

    if (input.content_type !== undefined) contentUpdateData.type = input.content_type
    if (input.content_title !== undefined) contentUpdateData.title = input.content_title
    if (input.content_creator !== undefined) contentUpdateData.creator = input.content_creator

    if (Object.keys(contentUpdateData).length > 0) {
      const { error: contentError } = await adminClient.from('contents').update(contentUpdateData).eq('id', input.content_id)

      if (contentError) throw contentError
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
  consumption_philosophy: string | null
}

export async function getCelebsForTitleEdit(): Promise<CelebTitleItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, profession, title, consumption_philosophy')
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

export async function getCelebsForPhilosophyEdit(page: number = 1, limit: number = 50): Promise<CelebsWithPaginationResponse> {
  const supabase = await createClient()
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, profession, title, consumption_philosophy', { count: 'exact' })
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

// #region updateCelebPhilosophy - 감상 철학만 업데이트
export async function updateCelebPhilosophy(celebId: string, philosophy: string | null): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ consumption_philosophy: philosophy })
    .eq('id', celebId)
    .eq('profile_type', 'CELEB')

  if (error) throw error

  revalidatePath('/members')
  revalidatePath('/members/philosophies')
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
        title,
        type,
        creator
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
    // Supabase 조인 결과는 배열 또는 단일 객체일 수 있음
    const contentData = Array.isArray(item.content) ? item.content[0] : item.content
    const content = contentData as { title: string; type: string; creator: string | null }
    const title = content.creator ? `${content.title}(${content.creator})` : content.title

    return {
      title,
      body: item.review || '',
      source: item.source_url || '',
    }
  })

  return { success: true, items }
}
// #endregion
