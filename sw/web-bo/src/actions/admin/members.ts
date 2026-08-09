'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUsers, type User } from './users'
import { getCelebs, type Celeb, type CelebImageFilter } from './celebs'
import { resolveCelebContentCount } from '@feelandnote/shared/constants/celeb-content-research'
import { requireAccountManager } from '@/lib/admin-auth'

/**
 * 상태 변경·삭제가 반영돼야 할 화면을 갱신한다.
 *
 * 이 액션들은 StatusToggle에서 오는데, 그 버튼이 셀럽 표(/celebs)와 유저 표(/users)
 * 양쪽에 걸려 있어 대상이 어느 쪽인지 memberId만으로는 가릴 수 없다. 그래서 두 목록을
 * 모두 갱신한다. 옛 대상이던 /members는 화면이 없는 리다이렉트 통로라 갱신해도 소용없었다.
 *
 * 셀럽 상세는 slug로 주소가 잡히므로(/celebs/[slug]) id로는 지정할 수 없다.
 * 여기엔 slug가 없어 라우트 패턴으로 해당 상세 전체를 대상으로 삼는다.
 * 이 갱신은 백오피스 자체 캐시에만 닿는다 — 서비스(web) 캐시는 revalidateWebCache가 따로 맡는다.
 */
// 계정 값은 26.08.07에 user_accounts로 갈라졌다. 인물에게는 이 행이 없으므로
// 붙여 읽으면 null 이거나 배열 한 칸으로 온다.
interface AccountRelation {
  email: string | null
  role: string | null
  account_status: string | null
  suspended_at: string | null
  suspended_reason: string | null
  last_seen_at: string | null
}

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function revalidateMemberPaths(memberId: string): void {
  revalidatePath('/users')
  revalidatePath(`/users/${memberId}`)
  revalidatePath('/celebs')
  revalidatePath('/celebs/[slug]', 'page')
}

// #region Types
export type ProfileType = 'USER' | 'CELEB'

export interface MemberInfluence {
  political: number
  political_exp: string | null
  strategic: number
  strategic_exp: string | null
  tech: number
  tech_exp: string | null
  social: number
  social_exp: string | null
  economic: number
  economic_exp: string | null
  cultural: number
  cultural_exp: string | null
  transhistoricity: number
  transhistoricity_exp: string | null
  total_score: number
}

export interface PersonaFieldJsonb {
  score: number
  reason_ko?: string
  reason_en?: string
}

export interface PersonaJsonb {
  abilities?: Record<string, PersonaFieldJsonb>
  inner_virtues?: Record<string, PersonaFieldJsonb>
  outer_virtues?: Record<string, PersonaFieldJsonb>
  dispositions?: Record<string, PersonaFieldJsonb>
  rationale_ko?: string
  rationale_en?: string
}

export interface MemberPersona {
  temperance: number
  diligence: number
  reflection: number
  courage: number
  loyalty: number
  benevolence: number
  fairness: number
  humility: number
  command: number
  martial: number
  intellect: number
  charm: number
  pessimism_optimism: number
  conservative_progressive: number
  individual_social: number
  cautious_bold: number
  persona?: PersonaJsonb | null
}

export interface Member {
  id: string
  slug: string | null
  email: string | null
  nickname: string | null
  avatar_url: string | null
  /** 인물 상세 상단 대표 화보(원본 비율). 얼굴 크롭 아바타와 별개 */
  portrait_url?: string | null
  bio: string | null
  profile_type: ProfileType
  status: string
  is_verified: boolean | null
  created_at: string
  // USER 전용
  role?: string
  last_seen_at?: string | null
  suspended_at?: string | null
  suspended_reason?: string | null
  // CELEB 전용
  profession?: string | null
  title?: string | null
  nationality?: string | null
  gender?: boolean | null
  birth_date?: string | null
  death_date?: string | null
  nickname_en?: string | null
  title_en?: string | null
  bio_en?: string | null
  cultural_journey?: string | null
  cultural_journey_en?: string | null
  virtual_monologue?: string | null
  /** 가상 독백 확정 잠금 시각. 값이 있으면 DB 트리거가 독백 수정을 차단한다 */
  virtual_monologue_locked_at?: string | null
  celeb_tier?: string | null
  claimed_by?: string | null
  speech_tone?: string | null
  has_voice?: boolean
  influence?: MemberInfluence | null
  influence_total?: number
  persona?: MemberPersona | null
  // 통계
  content_count: number
  content_research_status?: string
  content_research_updated_at?: string | null
  content_research_confirmed_empty_at?: string | null
  follower_count: number
  following_count?: number
  total_score?: number
}

export interface MembersResponse {
  members: Member[]
  total: number
}

export interface GetMembersParams {
  profileType?: ProfileType
  page?: number
  limit?: number
  search?: string
  status?: string
  role?: string
  profession?: string
  tier?: string
  imageFilter?: CelebImageFilter
  sort?: string
  sortOrder?: 'asc' | 'desc'
}
// #endregion

// #region getMembers
export async function getMembers(params: GetMembersParams = {}): Promise<MembersResponse> {
  const { profileType, page = 1, limit = 20, search, status, role, profession, tier, imageFilter, sort, sortOrder } = params

  // 타입이 지정되면 기존 로직 사용
  if (profileType === 'CELEB') {
    const { celebs, total } = await getCelebs({
      page,
      limit,
      search,
        status: status as 'active' | 'inactive' | 'suspended' | 'all',
      profession,
      tier: tier as 'full' | 'light' | 'all' | undefined,
      imageFilter,
      sort,
      sortOrder,
    })
    const members: Member[] = celebs.map((c) => celebToMember(c))
    return { members, total }
  }

  if (profileType === 'USER') {
    const { users, total } = await getUsers(page, limit, search, status, role, sort, sortOrder)
    const members: Member[] = users.map((u) => userToMember(u))
    return { members, total }
  }

  // 전체 조회: profiles 테이블에서 직접 조회
  const supabase = await createClient()
  const offset = (page - 1) * limit

  // 계정 값(이메일·권한·정지)은 26.08.07에 user_accounts로 갈라졌다.
  // 이 목록은 인물과 회원을 함께 담으므로 계정 기록은 있으면 붙이는 식으로 읽는다.
  let query = supabase
    .from('profiles')
    .select('*, user_accounts(email, role, account_status, suspended_at, suspended_reason, last_seen_at), user_social(follower_count, following_count), user_scores(total_score)', { count: 'exact' })

  if (search) {
    // 이름은 사람 기록에, 이메일은 계정 기록에 있어 한 번에 걸 수 없다.
    const { data: byEmail } = await supabase
      .from('user_accounts')
      .select('id')
      .ilike('email', `%${search}%`)
    const ids = (byEmail || []).map((row) => row.id)
    query = ids.length
      ? query.or(`nickname.ilike.%${search}%,id.in.(${ids.join(',')})`)
      : query.ilike('nickname', `%${search}%`)
  }
  // 이 걸개는 인물 공개 상태(profiles.status)를 본다. 회원 계정 정지는
  // profileType='USER' 경로(getUsers)가 계정 상태로 따로 거른다.
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (role && role !== 'all') {
    query = query.eq('user_accounts.role', role)
  }
  if (profession && profession !== 'all') {
    query = query.eq('profession', profession)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  // 콘텐츠 수 조회
  const userIds = data?.map((p) => p.id) || []
  const contentCounts = await getContentCounts(supabase, userIds)

  const members: Member[] = (data || []).map((p) => {
    const account = getSingleRelation(p.user_accounts)
    return {
    id: p.id,
    slug: p.slug || null,
    email: account?.email ?? null,
    nickname: p.nickname,
    avatar_url: p.avatar_url,
    bio: p.bio,
    profile_type: (p.profile_type === 'CELEB' ? 'CELEB' : 'USER') as ProfileType,
    // 회원은 계정 상태가, 인물은 공개 상태가 그 사람의 상태다.
    status: account?.account_status || p.status || 'active',
    is_verified: p.is_verified,
    created_at: p.created_at,
    role: account?.role ?? null,
    last_seen_at: account?.last_seen_at ?? null,
    suspended_at: account?.suspended_at ?? null,
    suspended_reason: account?.suspended_reason ?? null,
    profession: p.profession,
    title: p.title,
    nationality: p.nationality,
    gender: p.gender,
    birth_date: p.birth_date,
    death_date: p.death_date,
    claimed_by: p.claimed_by,
    content_count: contentCounts.get(p.id) || 0,
    follower_count: p.user_social?.follower_count || 0,
    following_count: p.user_social?.following_count || 0,
    total_score: p.user_scores?.total_score || 0,
    }
  })

  return { members, total: count || 0 }
}

function celebToMember(c: Celeb): Member {
  return {
    id: c.id,
    slug: c.slug,
    email: null,
    nickname: c.nickname,
    avatar_url: c.avatar_url,
    portrait_url: c.portrait_url,
    bio: c.bio,
    profile_type: 'CELEB',
    status: c.status,
    is_verified: c.is_verified,
    created_at: c.created_at,
    profession: c.profession,
    title: c.title,
    nationality: c.nationality,
    gender: c.gender,
    birth_date: c.birth_date,
    death_date: c.death_date,
    cultural_journey: c.cultural_journey,
    celeb_tier: c.celeb_tier,
    claimed_by: c.claimed_by,
    content_count: c.content_count,
    content_research_status: c.content_research_status,
    content_research_updated_at: c.content_research_updated_at,
    content_research_confirmed_empty_at: c.content_research_confirmed_empty_at,
    follower_count: c.follower_count,
    influence_total: c.influence_total,
  }
}

function userToMember(u: User): Member {
  return {
    id: u.id,
    slug: null,
    email: u.email,
    nickname: u.nickname,
    avatar_url: u.avatar_url,
    bio: u.bio,
    profile_type: 'USER',
    status: u.status,
    is_verified: u.is_verified,
    created_at: u.created_at,
    role: u.role,
    last_seen_at: u.last_seen_at,
    suspended_at: u.suspended_at,
    suspended_reason: u.suspended_reason,
    content_count: u.content_count,
    follower_count: u.follower_count,
    following_count: u.following_count,
    total_score: u.total_score,
  }
}

async function getContentCounts(supabase: Awaited<ReturnType<typeof createClient>>, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, number>()

  const { data } = await supabase
    .from('user_contents')
    .select('user_id')
    .in('user_id', userIds)

  const counts = new Map<string, number>()
  data?.forEach((row) => {
    counts.set(row.user_id, (counts.get(row.user_id) || 0) + 1)
  })
  return counts
}
// #endregion

// #region getMember
export async function getMember(id: string): Promise<Member | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      *,
      user_accounts (email, role, account_status, suspended_at, suspended_reason, last_seen_at),
      user_social (follower_count, following_count),
      user_scores (total_score),
      celeb_influence (
        political, political_exp,
        strategic, strategic_exp,
        tech, tech_exp,
        social, social_exp,
        economic, economic_exp,
        cultural, cultural_exp,
        transhistoricity, transhistoricity_exp,
        total_score
      ),
      celeb_persona (
        temperance, diligence, reflection, courage,
        loyalty, benevolence, fairness, humility,
        command, martial, intellect, charm,
        pessimism_optimism, conservative_progressive, individual_social, cautious_bold,
        persona
      )
    `
    )
    .eq('id', id)
    .single()

  if (error || !data) return null

  const { count } = await supabase
    .from('user_contents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', id)

  const profileType = (data.profile_type === 'CELEB' ? 'CELEB' : 'USER') as ProfileType
  const account = getSingleRelation(data.user_accounts)

  // celeb_influence 데이터 추출
  const influenceData = Array.isArray(data.celeb_influence)
    ? data.celeb_influence[0]
    : data.celeb_influence

  // celeb_persona 데이터 추출
  const personaData = Array.isArray(data.celeb_persona)
    ? data.celeb_persona[0]
    : data.celeb_persona

  return {
    id: data.id,
    slug: data.slug || null,
    email: account?.email ?? null,
    nickname: data.nickname,
    avatar_url: data.avatar_url,
    portrait_url: data.portrait_url ?? null,
    bio: data.bio,
    profile_type: profileType,
    // 회원은 계정 상태가, 인물은 공개 상태가 그 사람의 상태다.
    status: account?.account_status || data.status,
    is_verified: data.is_verified,
    created_at: data.created_at,
    role: account?.role ?? null,
    last_seen_at: account?.last_seen_at ?? null,
    suspended_at: account?.suspended_at ?? null,
    suspended_reason: account?.suspended_reason ?? null,
    profession: data.profession,
    title: data.title,
    nationality: data.nationality,
    gender: data.gender,
    birth_date: data.birth_date,
    death_date: data.death_date,
    nickname_en: data.nickname_en ?? null,
    title_en: data.title_en ?? null,
    bio_en: data.bio_en ?? null,
    cultural_journey: data.cultural_journey,
    cultural_journey_en: data.cultural_journey_en ?? null,
    virtual_monologue: data.virtual_monologue ?? null,
    virtual_monologue_locked_at: data.virtual_monologue_locked_at ?? null,
    speech_tone: data.speech_tone ?? null,
    has_voice: data.has_voice ?? false,
    celeb_tier: data.celeb_tier ?? 'full',
    claimed_by: data.claimed_by,
    influence: influenceData || null,
    persona: personaData || null,
    content_count:
      profileType === 'CELEB'
        ? resolveCelebContentCount(
            count,
      data.content_research_status
          )
        : count || 0,
    content_research_status: data.content_research_status ?? 'open',
    content_research_updated_at: data.content_research_updated_at ?? null,
    content_research_confirmed_empty_at:
      data.content_research_confirmed_empty_at ?? null,
    follower_count: data.user_social?.follower_count || 0,
    following_count: data.user_social?.following_count || 0,
    total_score: data.user_scores?.total_score || 0,
  }
}

export async function getMemberBySlug(rawSlug: string): Promise<Member | null> {
  const slug = decodeURIComponent(rawSlug)
  const supabase = await createClient()

  const selectQuery = `
      *,
      user_accounts (email, role, account_status, suspended_at, suspended_reason, last_seen_at),
      user_social (follower_count, following_count),
      user_scores (total_score),
      celeb_influence (
        political, political_exp,
        strategic, strategic_exp,
        tech, tech_exp,
        social, social_exp,
        economic, economic_exp,
        cultural, cultural_exp,
        transhistoricity, transhistoricity_exp,
        total_score
      ),
      celeb_persona (
        temperance, diligence, reflection, courage,
        loyalty, benevolence, fairness, humility,
        command, martial, intellect, charm,
        pessimism_optimism, conservative_progressive, individual_social, cautious_bold,
        persona
      )
    `

  const { data, error } = await supabase
    .from('profiles')
    .select(selectQuery)
    .eq('slug', slug)
    .single()

  if (error || !data) return null

  const { count } = await supabase
    .from('user_contents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', data.id)

  const profileType = (data.profile_type === 'CELEB' ? 'CELEB' : 'USER') as ProfileType
  const account = getSingleRelation(data.user_accounts)

  const influenceData = Array.isArray(data.celeb_influence)
    ? data.celeb_influence[0]
    : data.celeb_influence

  const personaData = Array.isArray(data.celeb_persona)
    ? data.celeb_persona[0]
    : data.celeb_persona

  return {
    id: data.id,
    slug: data.slug || null,
    email: account?.email ?? null,
    nickname: data.nickname,
    avatar_url: data.avatar_url,
    portrait_url: data.portrait_url ?? null,
    bio: data.bio,
    profile_type: profileType,
    // 회원은 계정 상태가, 인물은 공개 상태가 그 사람의 상태다.
    status: account?.account_status || data.status,
    is_verified: data.is_verified,
    created_at: data.created_at,
    role: account?.role ?? null,
    last_seen_at: account?.last_seen_at ?? null,
    suspended_at: account?.suspended_at ?? null,
    suspended_reason: account?.suspended_reason ?? null,
    profession: data.profession,
    title: data.title,
    nationality: data.nationality,
    gender: data.gender,
    birth_date: data.birth_date,
    death_date: data.death_date,
    nickname_en: data.nickname_en ?? null,
    title_en: data.title_en ?? null,
    bio_en: data.bio_en ?? null,
    cultural_journey: data.cultural_journey,
    cultural_journey_en: data.cultural_journey_en ?? null,
    virtual_monologue: data.virtual_monologue ?? null,
    virtual_monologue_locked_at: data.virtual_monologue_locked_at ?? null,
    speech_tone: data.speech_tone ?? null,
    has_voice: data.has_voice ?? false,
    celeb_tier: data.celeb_tier ?? 'full',
    claimed_by: data.claimed_by,
    influence: influenceData || null,
    influence_total: influenceData?.total_score || 0,
    persona: personaData || null,
    content_count:
      profileType === 'CELEB'
        ? resolveCelebContentCount(
            count,
      data.content_research_status
          )
        : count || 0,
    content_research_status: data.content_research_status ?? 'open',
    content_research_updated_at: data.content_research_updated_at ?? null,
    content_research_confirmed_empty_at:
      data.content_research_confirmed_empty_at ?? null,
    follower_count: data.user_social?.follower_count || 0,
    following_count: data.user_social?.following_count || 0,
    total_score: data.user_scores?.total_score || 0,
  }
}
// #endregion

// #region hardDeleteMember
export async function hardDeleteMember(memberId: string): Promise<void> {
  await requireAccountManager(memberId)
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_delete_auth_user', {
    target_user_id: memberId,
  })

  if (error) throw error

  revalidateMemberPaths(memberId)
}
// #endregion
