'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUsers, type User } from './users'
import { getCelebs, type Celeb } from './celebs'

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

export interface Member {
  id: string
  email: string | null
  nickname: string | null
  avatar_url: string | null
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
  quotes?: string | null
  portrait_url?: string | null
  claimed_by?: string | null
  consumption_philosophy?: string | null
  influence?: MemberInfluence | null
  // 통계
  content_count: number
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
  sort?: string
  sortOrder?: 'asc' | 'desc'
}
// #endregion

// #region getMembers
export async function getMembers(params: GetMembersParams = {}): Promise<MembersResponse> {
  const { profileType, page = 1, limit = 20, search, status, role, profession, sort, sortOrder } = params

  // 타입이 지정되면 기존 로직 사용
  if (profileType === 'CELEB') {
    const { celebs, total } = await getCelebs({
      page,
      limit,
      search,
      status: status as 'active' | 'suspended' | 'all',
      profession,
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

  let query = supabase
    .from('profiles')
    .select('*, user_social(follower_count, following_count), user_scores(total_score)', { count: 'exact' })

  if (search) {
    query = query.or(`nickname.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (role && role !== 'all') {
    query = query.eq('role', role)
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

  const members: Member[] = (data || []).map((p) => ({
    id: p.id,
    email: p.email,
    nickname: p.nickname,
    avatar_url: p.avatar_url,
    bio: p.bio,
    profile_type: (p.profile_type === 'CELEB' ? 'CELEB' : 'USER') as ProfileType,
    status: p.status || 'active',
    is_verified: p.is_verified,
    created_at: p.created_at,
    role: p.role,
    last_seen_at: p.last_seen_at,
    suspended_at: p.suspended_at,
    suspended_reason: p.suspended_reason,
    profession: p.profession,
    title: p.title,
    nationality: p.nationality,
    gender: p.gender,
    birth_date: p.birth_date,
    death_date: p.death_date,
    quotes: p.quotes,
    portrait_url: p.portrait_url,
    claimed_by: p.claimed_by,
    content_count: contentCounts.get(p.id) || 0,
    follower_count: p.user_social?.follower_count || 0,
    following_count: p.user_social?.following_count || 0,
    total_score: p.user_scores?.total_score || 0,
  }))

  return { members, total: count || 0 }
}

function celebToMember(c: Celeb): Member {
  return {
    id: c.id,
    email: null,
    nickname: c.nickname,
    avatar_url: c.avatar_url,
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
    quotes: c.quotes,
    consumption_philosophy: c.consumption_philosophy,
    portrait_url: c.portrait_url,
    claimed_by: c.claimed_by,
    content_count: c.content_count,
    follower_count: c.follower_count,
  }
}

function userToMember(u: User): Member {
  return {
    id: u.id,
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

  // celeb_influence 데이터 추출
  const influenceData = Array.isArray(data.celeb_influence)
    ? data.celeb_influence[0]
    : data.celeb_influence

  return {
    id: data.id,
    email: data.email,
    nickname: data.nickname,
    avatar_url: data.avatar_url,
    bio: data.bio,
    profile_type: profileType,
    status: data.status || 'active',
    is_verified: data.is_verified,
    created_at: data.created_at,
    role: data.role,
    last_seen_at: data.last_seen_at,
    suspended_at: data.suspended_at,
    suspended_reason: data.suspended_reason,
    profession: data.profession,
    title: data.title,
    nationality: data.nationality,
    gender: data.gender,
    birth_date: data.birth_date,
    death_date: data.death_date,
    quotes: data.quotes,
    consumption_philosophy: data.consumption_philosophy,
    portrait_url: data.portrait_url,
    claimed_by: data.claimed_by,
    influence: influenceData || null,
    content_count: count || 0,
    follower_count: data.user_social?.follower_count || 0,
    following_count: data.user_social?.following_count || 0,
    total_score: data.user_scores?.total_score || 0,
  }
}
// #endregion

// #region promoteToCeleb
export async function promoteToCeleb(userId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ profile_type: 'CELEB' })
    .eq('id', userId)
    .eq('profile_type', 'USER')

  if (error) throw error

  revalidatePath('/members')
  revalidatePath(`/members/${userId}`)
}
// #endregion

// #region softDeleteMember
export async function softDeleteMember(memberId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ status: 'deleted' })
    .eq('id', memberId)

  if (error) throw error

  revalidatePath('/members')
}
// #endregion

// #region hardDeleteMember
export async function hardDeleteMember(memberId: string): Promise<void> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  // note_id, playlist_id 먼저 조회
  const { data: notes } = await adminClient.from('notes').select('id').eq('user_id', memberId)
  const noteIds = notes?.map((n) => n.id) || []

  const { data: playlists } = await adminClient.from('playlists').select('id').eq('user_id', memberId)
  const playlistIds = playlists?.map((p) => p.id) || []

  // NO ACTION FK 참조 해제 (contributor_id, resolved_by 등)
  await adminClient.from('records').update({ contributor_id: null }).eq('contributor_id', memberId)
  await adminClient.from('user_contents').update({ contributor_id: null }).eq('contributor_id', memberId)
  await adminClient.from('reports').update({ resolved_by: null }).eq('resolved_by', memberId)

  // 관련 데이터 순차 삭제 (외래키 의존성 순서)
  const deleteQueries = [
    adminClient.from('record_likes').delete().eq('user_id', memberId),
    adminClient.from('record_comments').delete().eq('user_id', memberId),
    ...(noteIds.length > 0 ? [adminClient.from('note_sections').delete().in('note_id', noteIds)] : []),
    adminClient.from('notes').delete().eq('user_id', memberId),
    ...(playlistIds.length > 0 ? [adminClient.from('playlist_items').delete().in('playlist_id', playlistIds)] : []),
    adminClient.from('playlists').delete().eq('user_id', memberId),
    adminClient.from('records').delete().eq('user_id', memberId),
    adminClient.from('user_contents').delete().eq('user_id', memberId),
    adminClient.from('follows').delete().or(`follower_id.eq.${memberId},following_id.eq.${memberId}`),
    adminClient.from('blocks').delete().or(`blocker_id.eq.${memberId},blocked_id.eq.${memberId}`),
    adminClient.from('guestbook_entries').delete().or(`profile_id.eq.${memberId},author_id.eq.${memberId}`),
    adminClient.from('activity_logs').delete().eq('user_id', memberId),
    adminClient.from('score_logs').delete().eq('user_id', memberId),
    adminClient.from('user_titles').delete().eq('user_id', memberId),
    adminClient.from('user_scores').delete().eq('user_id', memberId),
    adminClient.from('user_social').delete().eq('user_id', memberId),
    adminClient.from('tier_lists').delete().eq('user_id', memberId),
    adminClient.from('blind_game_scores').delete().eq('user_id', memberId),
    adminClient.from('celeb_influence').delete().eq('celeb_id', memberId),
    adminClient.from('celeb_tag_assignments').delete().eq('celeb_id', memberId),
    adminClient.from('ai_reviews').delete().eq('user_id', memberId),
    adminClient.from('notifications').delete().eq('user_id', memberId),
    adminClient.from('content_recommendations').delete().or(`sender_id.eq.${memberId},receiver_id.eq.${memberId}`),
  ]

  for (const query of deleteQueries) {
    await query
  }

  // auth.users에서 삭제 (profiles는 CASCADE로 자동 삭제됨)
  // auth.admin.deleteUser API는 confirmation_token NULL 버그로 실패할 수 있으므로 RPC 사용
  const { error } = await adminClient.rpc('delete_auth_user', { target_user_id: memberId })

  if (error) throw error

  revalidatePath('/members')
}
// #endregion
