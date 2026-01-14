'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUsers, type User } from './users'
import { getCelebs, type Celeb } from './celebs'

// #region Types
export type ProfileType = 'USER' | 'CELEB'

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
  nationality?: string | null
  birth_date?: string | null
  death_date?: string | null
  quotes?: string | null
  portrait_url?: string | null
  claimed_by?: string | null
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
}
// #endregion

// #region getMembers
export async function getMembers(params: GetMembersParams = {}): Promise<MembersResponse> {
  const { profileType = 'USER', page = 1, limit = 20, search, status, role, profession } = params

  if (profileType === 'CELEB') {
    const { celebs, total } = await getCelebs({
      page,
      limit,
      search,
      status: status as 'active' | 'suspended' | 'all',
      profession,
    })

    const members: Member[] = celebs.map((c) => ({
      id: c.id,
      email: null,
      nickname: c.nickname,
      avatar_url: c.avatar_url,
      bio: c.bio,
      profile_type: 'CELEB' as const,
      status: c.status,
      is_verified: c.is_verified,
      created_at: c.created_at,
      profession: c.profession,
      nationality: c.nationality,
      birth_date: c.birth_date,
      death_date: c.death_date,
      quotes: c.quotes,
      portrait_url: c.portrait_url,
      claimed_by: c.claimed_by,
      content_count: c.content_count,
      follower_count: c.follower_count,
    }))

    return { members, total }
  }

  const { users, total } = await getUsers(page, limit, search, status, role)

  const members: Member[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    avatar_url: u.avatar_url,
    bio: u.bio,
    profile_type: 'USER' as const,
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
  }))

  return { members, total }
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
      user_scores (total_score)
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
    nationality: data.nationality,
    birth_date: data.birth_date,
    death_date: data.death_date,
    quotes: data.quotes,
    portrait_url: data.portrait_url,
    claimed_by: data.claimed_by,
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
