'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUsers, type User } from './users'
import { getCelebs, type Celeb, type CelebImageFilter } from './celebs'
import { resolveCelebContentCount } from '@feelandnote/shared/constants/celeb-content-research'
import { requireAccountManager } from '@/lib/admin-auth'

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

export type ProfileDomain = 'USER' | 'CELEB'

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

export interface SpectrumFieldJsonb {
  score: number
  reason_ko?: string
  reason_en?: string
}

export interface SpectrumJsonb {
  abilities?: Record<string, SpectrumFieldJsonb>
  inner_virtues?: Record<string, SpectrumFieldJsonb>
  outer_virtues?: Record<string, SpectrumFieldJsonb>
  dispositions?: Record<string, SpectrumFieldJsonb>
  rationale_ko?: string
  rationale_en?: string
}

export interface MemberSpectrum {
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
  spectrum?: SpectrumJsonb | null
}

export interface Member {
  id: string
  slug: string | null
  email: string | null
  nickname: string | null
  avatar_url: string | null
  portrait_url?: string | null
  bio: string | null
  subject_kind: 'member' | 'celeb'
  status: string
  is_verified: boolean | null
  created_at: string
  role?: string
  last_seen_at?: string | null
  suspended_at?: string | null
  suspended_reason?: string | null
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
  virtual_monologue_locked_at?: string | null
  celeb_tier?: string | null
  claimed_by?: string | null
  speech_tone?: string | null
  has_voice?: boolean
  influence?: MemberInfluence | null
  influence_total?: number
  spectrum?: MemberSpectrum | null
  content_count: number
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
  profileType?: ProfileDomain
  page?: number
  limit?: number
  search?: string
  status?: string
  role?: string
  profession?: string
  tier?: string
  imageFilter?: CelebImageFilter
  tagId?: string
  sort?: string
  sortOrder?: 'asc' | 'desc'
}

export async function getMembers(params: GetMembersParams = {}): Promise<MembersResponse> {
  const { profileType, page = 1, limit = 20, search, status, role, profession, tier, imageFilter, tagId, sort, sortOrder } = params

  if (profileType === 'CELEB') {
    const { celebs, total } = await getCelebs({
      page,
      limit,
      search,
      status: status as 'active' | 'inactive' | 'all',
      profession,
      tier: tier as 'full' | 'light' | 'all' | undefined,
      imageFilter,
      tagId,
      sort,
      sortOrder,
    })
    return { members: celebs.map(celebToMember), total }
  }

  if (profileType === 'USER') {
    const { users, total } = await getUsers(page, limit, search, status, role, sort, sortOrder)
    return { members: users.map(userToMember), total }
  }

  throw new Error('회원·셀럽 통합 조회는 프로필 분리 리팩터링이 완료될 때까지 사용할 수 없습니다. profileType을 지정해 주세요.')
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
    subject_kind: 'celeb',
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
    subject_kind: 'member',
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

const CELEB_DETAIL_SELECT = `
  *,
  status:publication_status,
  cultural_journey:consumption_philosophy,
  cultural_journey_en:consumption_philosophy_en,
  celeb_metrics!celeb_metrics_celeb_id_fkey (follower_count),
  celeb_influence!celeb_influence_celebs_fkey (
    political, political_exp, strategic, strategic_exp, tech, tech_exp,
    social, social_exp, economic, economic_exp, cultural, cultural_exp,
    transhistoricity, transhistoricity_exp, total_score
  ),
  celeb_spectrum:celeb_persona!celeb_persona_celebs_fkey (
    temperance, diligence, reflection, courage, loyalty, benevolence,
    fairness, humility, command, martial, intellect, charm,
    pessimism_optimism, conservative_progressive, individual_social, cautious_bold,
    spectrum:persona
  )
`

async function getMemberContentCount(id: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('member_contents')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', id)
  if (error) throw error
  return count || 0
}

async function getCelebContentCount(id: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('celeb_contents')
    .select('*', { count: 'exact', head: true })
    .eq('celeb_id', id)
  if (error) throw error
  return count || 0
}

async function memberProfileToMember(data: any): Promise<Member> {
  const account = getSingleRelation<AccountRelation>(data.user_accounts)
  const supabase = await createClient()
  const [contentCount, socialResult, scoreResult] = await Promise.all([
    getMemberContentCount(data.id),
    supabase
      .from('member_social_stats')
      .select('follower_count, following_count')
      .eq('member_id', data.id)
      .maybeSingle(),
    supabase
      .from('member_scores')
      .select('total_score')
      .eq('member_id', data.id)
      .maybeSingle(),
  ])
  if (socialResult.error) throw socialResult.error
  if (scoreResult.error) throw scoreResult.error
  const social = socialResult.data
  const score = scoreResult.data
  return {
    id: data.id,
    slug: null,
    email: account?.email ?? null,
    nickname: data.nickname,
    avatar_url: data.avatar_url,
    bio: data.bio,
    subject_kind: 'member',
    status: account?.account_status || 'active',
    is_verified: data.is_verified,
    created_at: data.created_at,
    role: account?.role ?? undefined,
    last_seen_at: account?.last_seen_at ?? null,
    suspended_at: account?.suspended_at ?? null,
    suspended_reason: account?.suspended_reason ?? null,
    nationality: data.nationality ?? null,
    birth_date: data.birth_date ?? null,
    content_count: contentCount,
    follower_count: social?.follower_count || 0,
    following_count: social?.following_count || 0,
    total_score: score?.total_score || 0,
  }
}

async function celebProfileToMember(data: any): Promise<Member> {
  const contentCount = await getCelebContentCount(data.id)
  const influence = getSingleRelation<MemberInfluence>(data.celeb_influence)
  const spectrum = getSingleRelation<MemberSpectrum>(data.celeb_spectrum)
  const metrics = getSingleRelation<{ follower_count?: number | null }>(data.celeb_metrics)
  return {
    id: data.id,
    slug: data.slug || null,
    email: null,
    nickname: data.nickname,
    avatar_url: data.avatar_url,
    portrait_url: data.portrait_url ?? null,
    bio: data.bio,
    subject_kind: 'celeb',
    status: data.status || data.publication_status || 'active',
    is_verified: data.is_verified,
    created_at: data.created_at,
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
    claimed_by: data.claimed_by_member_id ?? null,
    influence,
    influence_total: influence?.total_score || 0,
    spectrum,
    content_count: resolveCelebContentCount(
      contentCount,
      data.content_research_confirmed_empty_at
    ),
    content_research_confirmed_empty_at: data.content_research_confirmed_empty_at ?? null,
    follower_count: metrics?.follower_count || 0,
  }
}

export async function getMember(id: string): Promise<Member | null> {
  const supabase = await createClient()
  const { data: member, error: memberError } = await supabase
    .from('member_profiles')
    .select(`
      *,
      user_accounts:user_accounts!member_profiles_id_fkey (email, role, account_status, suspended_at, suspended_reason, last_seen_at)
    `)
    .eq('id', id)
    .maybeSingle()

  if (memberError) throw memberError
  if (member) return memberProfileToMember(member)

  const { data: celeb, error: celebError } = await supabase
    .from('celebs')
    .select(CELEB_DETAIL_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (celebError) throw celebError
  return celeb ? celebProfileToMember(celeb) : null
}

export async function getMemberBySlug(rawSlug: string): Promise<Member | null> {
  const slug = decodeURIComponent(rawSlug)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('celebs')
    .select(CELEB_DETAIL_SELECT)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data ? celebProfileToMember(data) : null
}

export async function hardDeleteMember(memberId: string): Promise<void> {
  await requireAccountManager(memberId)
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_delete_auth_user', {
    target_user_id: memberId,
  })

  if (error) throw error
  revalidateMemberPaths(memberId)
}
