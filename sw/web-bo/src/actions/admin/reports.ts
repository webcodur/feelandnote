'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Report {
  id: string
  reporter_id: string
  target_type: string
  target_id: string
  reason: string
  description: string | null
  status: string
  resolved_by: string | null
  resolved_at: string | null
  resolution_note: string | null
  created_at: string
  updated_at: string
  reporter: {
    id: string
    nickname: string | null
    email: string | null
    avatar_url: string | null
  } | null
  resolver: {
    nickname: string | null
  } | null
}

export interface ReportDetail extends Report {
  target_info: Record<string, unknown> | null
}

const TARGET_TYPE_MAP = {
  user: 'profiles',
  record: 'records',
  content: 'contents',
  comment: 'record_comments',
  guestbook: 'guestbook_entries',
} as const

export async function getReport(reportId: string): Promise<ReportDetail | null> {
  const supabase = await createClient()

  const { data: report, error } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:reporter_id (id, nickname, email, avatar_url),
      resolver:resolved_by (nickname)
    `)
    .eq('id', reportId)
    .single()

  if (error || !report) return null

  // 신고 대상 정보 조회
  let targetInfo: Record<string, unknown> | null = null
  const tableName = TARGET_TYPE_MAP[report.target_type as keyof typeof TARGET_TYPE_MAP]

  if (tableName) {
    const { data } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', report.target_id)
      .single()
    targetInfo = data
  }

  return {
    id: report.id,
    reporter_id: report.reporter_id,
    target_type: report.target_type,
    target_id: report.target_id,
    reason: report.reason,
    description: report.description,
    status: report.status,
    resolved_by: report.resolved_by,
    resolved_at: report.resolved_at,
    resolution_note: report.resolution_note,
    created_at: report.created_at,
    updated_at: report.updated_at,
    reporter: report.reporter as Report['reporter'],
    resolver: report.resolver as Report['resolver'],
    target_info: targetInfo,
  }
}

export async function resolveReport(
  reportId: string,
  resolverId: string,
  note: string,
  action?: 'suspend_user' | 'delete_content' | 'none'
): Promise<void> {
  const supabase = await createClient()

  // 신고 정보 조회
  const { data: report } = await supabase
    .from('reports')
    .select('target_type, target_id')
    .eq('id', reportId)
    .single()

  if (!report) throw new Error('신고를 찾을 수 없습니다')

  // 액션 수행
  if (action === 'suspend_user' && report.target_type === 'user') {
    await supabase
      .from('profiles')
      .update({
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspended_reason: `신고 처리: ${note}`,
      })
      .eq('id', report.target_id)
  } else if (action === 'delete_content') {
    const tableName = TARGET_TYPE_MAP[report.target_type as keyof typeof TARGET_TYPE_MAP]
    if (tableName && tableName !== 'profiles') {
      await supabase.from(tableName).delete().eq('id', report.target_id)
    }
  }

  // 신고 상태 업데이트
  const { error } = await supabase
    .from('reports')
    .update({
      status: 'resolved',
      resolved_by: resolverId,
      resolved_at: new Date().toISOString(),
      resolution_note: note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)

  if (error) throw error

  revalidatePath('/reports')
  revalidatePath(`/reports/${reportId}`)
}

export async function rejectReport(
  reportId: string,
  resolverId: string,
  note: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('reports')
    .update({
      status: 'rejected',
      resolved_by: resolverId,
      resolved_at: new Date().toISOString(),
      resolution_note: note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)

  if (error) throw error

  revalidatePath('/reports')
  revalidatePath(`/reports/${reportId}`)
}
