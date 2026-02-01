'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface User {
  id: string
  email: string
  nickname: string | null
  avatar_url: string | null
  bio: string | null
  role: string
  status: string
  created_at: string
  last_seen_at: string | null
  suspended_at: string | null
  suspended_reason: string | null
  profile_type: string | null
  is_verified: boolean | null
  // 통계 정보
  content_count: number
  follower_count: number
  following_count: number
  total_score: number
}

export interface UsersResponse {
  users: User[]
  total: number
}

export async function getUsers(
  page: number = 1,
  limit: number = 20,
  search?: string,
  status?: string,
  role?: string
): Promise<UsersResponse> {
  const supabase = await createClient()

  const offset = (page - 1) * limit

  let query = supabase
    .from('profiles')
    .select(`
      *,
      user_social (follower_count, following_count),
      user_scores (total_score)
    `, { count: 'exact' })
    .or('profile_type.is.null,profile_type.eq.USER')

  // 검색 필터
  if (search) {
    query = query.or(`email.ilike.%${search}%,nickname.ilike.%${search}%`)
  }

  // 상태 필터
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  // 역할 필터
  if (role && role !== 'all') {
    query = query.eq('role', role)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  // 콘텐츠 수 조회
  const userIds = (data || []).map(u => u.id)
  const { data: contentCounts } = await supabase
    .from('user_contents')
    .select('user_id')
    .in('user_id', userIds)

  const contentCountMap = (contentCounts || []).reduce((acc, item) => {
    acc[item.user_id] = (acc[item.user_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const users: User[] = (data || []).map(user => ({
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatar_url: user.avatar_url,
    bio: user.bio,
    role: user.role || 'user',
    status: user.status || 'active',
    created_at: user.created_at,
    last_seen_at: user.last_seen_at,
    suspended_at: user.suspended_at,
    suspended_reason: user.suspended_reason,
    profile_type: user.profile_type,
    is_verified: user.is_verified,
    content_count: contentCountMap[user.id] || 0,
    follower_count: user.user_social?.follower_count || 0,
    following_count: user.user_social?.following_count || 0,
    total_score: user.user_scores?.total_score || 0,
  }))

  return {
    users,
    total: count || 0,
  }
}

export async function getUser(userId: string): Promise<User | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null

  return data
}

export async function suspendUser(userId: string, reason: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_reason: reason,
    })
    .eq('id', userId)

  if (error) throw error

  revalidatePath('/users')
}

export async function unsuspendUser(userId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      status: 'active',
      suspended_at: null,
      suspended_reason: null,
    })
    .eq('id', userId)

  if (error) throw error

  revalidatePath('/users')
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  const supabase = await createClient()

  if (!['user', 'admin', 'super_admin'].includes(role)) {
    throw new Error('Invalid role')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) throw error

  revalidatePath('/users')
}

export interface UpdateProfileData {
  nickname?: string
  avatar_url?: string
  bio?: string
  is_verified?: boolean
}

export async function updateUserProfile(userId: string, data: UpdateProfileData): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)

  if (error) throw error

  revalidatePath('/users')
  revalidatePath(`/users/${userId}`)
}
