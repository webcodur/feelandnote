'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { generateCelebProfileWithInfluence as generateCelebProfileApi } from '@feelnnote/api-clients'
import type { GeneratedInfluence } from '@feelnnote/api-clients'
import { getBestAvailableKey, getApiKeyById, recordApiKeyUsage } from './api-keys'

// #region Types
export interface Celeb {
  id: string
  nickname: string | null
  avatar_url: string | null
  profession: string | null
  bio: string | null
  is_verified: boolean | null
  status: string
  claimed_by: string | null
  created_at: string
  content_count: number
  follower_count: number
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
}

interface CreateCelebInput {
  nickname: string
  profession?: string
  bio?: string
  avatar_url?: string
  is_verified?: boolean
  influence?: GeneratedInfluence
}

interface UpdateCelebInput {
  id: string
  nickname?: string
  profession?: string
  bio?: string
  avatar_url?: string
  is_verified?: boolean
  status?: 'active' | 'suspended'
}

interface GenerateProfileInput {
  name: string
  description: string
  selectedKeyId?: string
}

interface GenerateProfileResult {
  success: boolean
  profile?: {
    bio: string
    profession: string
    avatarUrl: string
    influence: GeneratedInfluence
  }
  error?: string
}
// #endregion

// #region getCelebs
export async function getCelebs(params: GetCelebsParams = {}): Promise<CelebsResponse> {
  const { page = 1, limit = 20, search, status, profession } = params
  const supabase = await createClient()
  const offset = (page - 1) * limit

  let query = supabase
    .from('profiles')
    .select(
      `
      *,
      user_social (follower_count)
    `,
      { count: 'exact' }
    )
    .eq('profile_type', 'CELEB')

  if (search) {
    query = query.ilike('nickname', `%${search}%`)
  }

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (profession && profession !== 'all') {
    query = query.eq('profession', profession)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  const userIds = (data || []).map((u) => u.id)
  const { data: contentCounts } = await supabase
    .from('user_contents')
    .select('user_id')
    .in('user_id', userIds)

  const contentCountMap = (contentCounts || []).reduce(
    (acc, item) => {
      acc[item.user_id] = (acc[item.user_id] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const celebs: Celeb[] = (data || []).map((celeb) => ({
    id: celeb.id,
    nickname: celeb.nickname,
    avatar_url: celeb.avatar_url,
    profession: celeb.profession,
    bio: celeb.bio,
    is_verified: celeb.is_verified,
    status: celeb.status || 'active',
    claimed_by: celeb.claimed_by,
    created_at: celeb.created_at,
    content_count: contentCountMap[celeb.id] || 0,
    follower_count: celeb.user_social?.follower_count || 0,
  }))

  return {
    celebs,
    total: count || 0,
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
      user_social (follower_count)
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
    profession: data.profession,
    bio: data.bio,
    is_verified: data.is_verified,
    status: data.status || 'active',
    claimed_by: data.claimed_by,
    created_at: data.created_at,
    content_count: contentCount || 0,
    follower_count: data.user_social?.follower_count || 0,
  }
}
// #endregion

// #region createCeleb
export async function createCeleb(input: CreateCelebInput): Promise<{ id: string }> {
  // Admin 클라이언트 사용 (RLS 우회 필요)
  const adminClient = createAdminClient()

  // 더미 이메일 생성 (auth.users FK 제약 때문에 필요)
  const dummyId = crypto.randomUUID()
  const dummyEmail = `celeb_${dummyId}@feelnnote.local`
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
      bio: input.bio || null,
      avatar_url: input.avatar_url || null,
      is_verified: input.is_verified || false,
      profile_type: 'CELEB',
      status: 'active',
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
      rank: inf.rank,
    })

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
  if (input.bio !== undefined) updateData.bio = input.bio
  if (input.avatar_url !== undefined) updateData.avatar_url = input.avatar_url
  if (input.is_verified !== undefined) updateData.is_verified = input.is_verified
  if (input.status !== undefined) updateData.status = input.status

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', input.id)
    .eq('profile_type', 'CELEB')

  if (error) throw error

  revalidatePath('/celebs')
  revalidatePath(`/celebs/${input.id}`)
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

  // Gemini 호출
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
  }
}

export async function getCelebContents(
  celebId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ contents: CelebContent[]; total: number }> {
  const supabase = await createClient()
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('user_contents')
    .select(
      `
      *,
      content:contents (
        id,
        title,
        type,
        creator,
        thumbnail_url
      )
    `,
      { count: 'exact' }
    )
    .eq('user_id', celebId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

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

export async function addCelebContent(input: AddCelebContentInput): Promise<{ id: string }> {
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
    // 이미 있으면 리뷰/출처 업데이트
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.review) updateData.review = input.review
    if (input.source_url) updateData.source_url = input.source_url
    if (input.status) updateData.status = input.status

    const { error: updateError } = await supabase
      .from('user_contents')
      .update(updateData)
      .eq('id', existing.id)

    if (updateError) throw updateError

    revalidatePath(`/celebs/${input.celeb_id}/contents`)
    return { id: existing.id }
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
}

export async function updateCelebContent(input: UpdateCelebContentInput): Promise<void> {
  // Admin 클라이언트 사용 (RLS 우회)
  const adminClient = createAdminClient()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (input.status !== undefined) updateData.status = input.status
  if (input.rating !== undefined) updateData.rating = input.rating
  if (input.review !== undefined) updateData.review = input.review
  if (input.is_spoiler !== undefined) updateData.is_spoiler = input.is_spoiler
  if (input.visibility !== undefined) updateData.visibility = input.visibility
  if (input.source_url !== undefined) updateData.source_url = input.source_url

  const { error } = await adminClient.from('user_contents').update(updateData).eq('id', input.id)

  if (error) throw error

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
