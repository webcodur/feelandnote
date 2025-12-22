'use server'

import { createClient } from '@/lib/supabase/server'

export interface DashboardStats {
  totalUsers: number
  todayNewUsers: number
  totalContents: number
  totalRecords: number
  activeUsers: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 전체 사용자 수
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // 오늘 가입자 수
  const { count: todayNewUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  // 전체 콘텐츠 수
  const { count: totalContents } = await supabase
    .from('contents')
    .select('*', { count: 'exact', head: true })

  // 전체 기록 수
  const { count: totalRecords } = await supabase
    .from('records')
    .select('*', { count: 'exact', head: true })

  // 최근 7일 활성 사용자 (user_contents 기준)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: activeData } = await supabase
    .from('user_contents')
    .select('user_id')
    .gte('updated_at', weekAgo.toISOString())

  const activeUsers = new Set(activeData?.map(d => d.user_id)).size

  return {
    totalUsers: totalUsers || 0,
    todayNewUsers: todayNewUsers || 0,
    totalContents: totalContents || 0,
    totalRecords: totalRecords || 0,
    activeUsers,
  }
}

export interface RecentUser {
  id: string
  email: string
  nickname: string | null
  created_at: string
  status: string
}

export async function getRecentUsers(limit: number = 5): Promise<RecentUser[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, email, nickname, created_at, status')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}
