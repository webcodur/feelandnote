'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface User {
  id: string
  email: string
  nickname: string | null
  avatar_url: string | null
  role: string
  status: string
  created_at: string
  last_seen_at: string | null
  suspended_at: string | null
  suspended_reason: string | null
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
    .select('*', { count: 'exact' })

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

  return {
    users: data || [],
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
