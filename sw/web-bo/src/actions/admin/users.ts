'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccountManager, requireAdmin } from '@/lib/admin-auth'
import { revalidatePath } from 'next/cache'

// 사람 기록(profiles)과 계정 기록(user_accounts)은 26.08.07에 갈라졌다.
// 이 화면은 회원 계정을 다루므로 두 쪽을 함께 읽는다.
// - 이름·소개·사진·인증 여부 → profiles
// - 이메일·권한·계정 상태·정지·마지막 접속 → user_accounts
// 계정 기록은 회원에게만 있으므로 !inner 로 묶으면 인물이 저절로 빠진다.

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

interface AccountRow {
  email: string | null
  role: string | null
  account_status: string | null
  suspended_at: string | null
  suspended_reason: string | null
  last_seen_at: string | null
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

const ACCOUNT_COLUMNS =
  'email, role, account_status, suspended_at, suspended_reason, last_seen_at'

export async function getUsers(
  page: number = 1,
  limit: number = 20,
  search?: string,
  status?: string,
  role?: string,
  sort: string = 'created_at',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<UsersResponse> {
  const supabase = await createClient()

  const offset = (page - 1) * limit

  let query = supabase
    .from('profiles')
    .select(`
      *,
      user_accounts!inner (${ACCOUNT_COLUMNS}),
      user_social (follower_count, following_count),
      user_scores (total_score)
    `, { count: 'exact' })

  // 검색: 이름은 사람 기록에, 이메일은 계정 기록에 있어 한 번에 걸 수 없다.
  // 이메일로 먼저 대상을 좁힌 뒤 이름과 함께 묶는다.
  if (search) {
    const { data: byEmail } = await supabase
      .from('user_accounts')
      .select('id')
      .ilike('email', `%${search}%`)
    const ids = (byEmail || []).map((row) => row.id)
    query = ids.length
      ? query.or(`nickname.ilike.%${search}%,id.in.(${ids.join(',')})`)
      : query.ilike('nickname', `%${search}%`)
  }

  // 계정 상태 필터
  if (status && status !== 'all') {
    query = query.eq('user_accounts.account_status', status)
  }

  // 권한 필터
  if (role && role !== 'all') {
    query = query.eq('user_accounts.role', role)
  }

  // 정렬 적용
  const ascending = sortOrder === 'asc'
  const profileSortColumns = ['nickname', 'created_at']
  const accountSortColumns = ['email', 'role', 'status']
  const relationSortColumns = ['follower_count', 'content_count']

  if (relationSortColumns.includes(sort)) {
    query = query.order(sort, { referencedTable: 'user_social', ascending })
  } else if (accountSortColumns.includes(sort)) {
    const column = sort === 'status' ? 'account_status' : sort
    query = query.order(column, { referencedTable: 'user_accounts', ascending })
  } else {
    const sortColumn = profileSortColumns.includes(sort) ? sort : 'created_at'
    query = query.order(sortColumn, { ascending })
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

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

  const users: User[] = (data || []).map(user => {
    const account = firstRelation<AccountRow>(user.user_accounts)
    return {
      id: user.id,
      email: account?.email ?? '',
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      bio: user.bio,
      role: account?.role || 'user',
      status: account?.account_status || 'active',
      created_at: user.created_at,
      last_seen_at: account?.last_seen_at ?? null,
      suspended_at: account?.suspended_at ?? null,
      suspended_reason: account?.suspended_reason ?? null,
      profile_type: user.profile_type,
      is_verified: user.is_verified,
      content_count: contentCountMap[user.id] || 0,
      follower_count: user.user_social?.follower_count || 0,
      following_count: user.user_social?.following_count || 0,
      total_score: user.user_scores?.total_score || 0,
    }
  })

  return {
    users,
    total: count || 0,
  }
}

export async function getUser(userId: string): Promise<User | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select(`*, user_accounts (${ACCOUNT_COLUMNS})`)
    .eq('id', userId)
    .single()

  if (error || !data) return null

  const account = firstRelation<AccountRow>(data.user_accounts)

  return {
    id: data.id,
    email: account?.email ?? '',
    nickname: data.nickname,
    avatar_url: data.avatar_url,
    bio: data.bio,
    role: account?.role || 'user',
    status: account?.account_status || 'active',
    created_at: data.created_at,
    last_seen_at: account?.last_seen_at ?? null,
    suspended_at: account?.suspended_at ?? null,
    suspended_reason: account?.suspended_reason ?? null,
    profile_type: data.profile_type,
    is_verified: data.is_verified,
    content_count: 0,
    follower_count: 0,
    following_count: 0,
    total_score: 0,
  }
}

export async function suspendUser(userId: string, reason: string): Promise<void> {
  await requireAccountManager(userId)

  const admin = createAdminClient()
  const { data: previous, error: previousError } = await admin
    .from('user_accounts')
    .select('account_status, suspended_at, suspended_reason')
    .eq('id', userId)
    .maybeSingle()

  if (previousError) throw previousError
  if (!previous) throw new Error('정지할 회원을 찾을 수 없습니다.')

  const { error } = await admin
    .from('user_accounts')
    .update({
      account_status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_reason: reason,
    })
    .eq('id', userId)

  if (error) throw error

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: '876000h',
  })

  if (banError) {
    const { error: rollbackError } = await admin
      .from('user_accounts')
      .update(previous)
      .eq('id', userId)

    if (rollbackError) {
      throw new Error(`Auth 정지 실패 후 계정 상태 복구도 실패했습니다: ${rollbackError.message}`)
    }
    throw banError
  }

  revalidatePath('/users')
}

export async function unsuspendUser(userId: string): Promise<void> {
  const { target } = await requireAccountManager(userId)
  if (target.account_status !== 'suspended') {
    throw new Error('정지된 회원만 정지를 해제할 수 있습니다.')
  }

  const admin = createAdminClient()

  const { error: unbanError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  })

  if (unbanError) throw unbanError

  const { error } = await admin
    .from('user_accounts')
    .update({
      account_status: 'active',
      suspended_at: null,
      suspended_reason: null,
    })
    .eq('id', userId)
    .eq('account_status', 'suspended')
    .select('id')
    .single()

  if (error) {
    const { error: rebanError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: '876000h',
    })
    if (rebanError) {
      throw new Error(`계정 상태 갱신 실패 후 Auth 재정지도 실패했습니다: ${rebanError.message}`)
    }
    throw error
  }

  revalidatePath('/users')
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  const { admin } = await requireAccountManager(userId)
  if (admin.role !== 'super_admin') throw new Error('최고 관리자 권한이 필요합니다.')
  const supabase = await createClient()

  if (!['user', 'admin', 'super_admin'].includes(role)) {
    throw new Error('Invalid role')
  }

  const { error } = await supabase
    .from('user_accounts')
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
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)

  if (error) throw error

  revalidatePath('/users')
  revalidatePath(`/users/${userId}`)
}
