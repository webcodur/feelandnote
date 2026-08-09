'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'
import {
  ENUM_REPORT_STATUS,
  REPORT_PAGE_SIZE,
  REPORT_STATUS_ORDER,
  isReportReason,
  isReportStatus,
  isReportTargetType,
  type ReportStatus,
} from '@/constants/moderation'

// 신고 큐 목록. 페이징하고 정렬키에 고유키(id)를 2차로 고정한다 —
// PostgREST 는 정렬이 흔들리면 페이지 사이에서 행을 중복·누락시킨다.

// #region 타입
export interface ReportPerson {
  id: string
  nickname: string | null
  email: string | null
}

export interface ReportQueueRow {
  id: string
  targetType: string
  targetId: string
  targetUserId: string | null
  reason: string
  status: string
  createdAt: string
  resolvedAt: string | null
  reporter: ReportPerson | null
  targetUser: ReportPerson | null
  resolverNickname: string | null
}

export interface ReportQueueParams {
  page: number
  status: string
  targetType: string
  reason: string
  targetId: string
}

export interface ReportQueue {
  rows: ReportQueueRow[]
  total: number
  totalPages: number
  statusCounts: Record<ReportStatus, number>
}

interface RawQueueRow {
  id: string
  target_type: string
  target_id: string
  target_user_id: string | null
  reason: string
  status: string
  created_at: string
  resolved_at: string | null
  reporter: RawReportPerson | null
  targetUser: RawReportPerson | null
  resolver: { nickname: string | null } | null
}

interface RawReportPerson {
  id: string
  nickname: string | null
  user_accounts: { email: string | null } | { email: string | null }[] | null
}
// #endregion

const QUEUE_SELECT = `
  id, target_type, target_id, target_user_id, reason, status, created_at, resolved_at,
  reporter:profiles!reports_reporter_id_fkey (id, nickname, user_accounts!user_accounts_id_fkey(email)),
  targetUser:profiles!reports_target_user_id_fkey (id, nickname, user_accounts!user_accounts_id_fkey(email)),
  resolver:profiles!reports_resolved_by_fkey (nickname)
`

function toReportPerson(person: RawReportPerson | null): ReportPerson | null {
  if (!person) return null
  const account = Array.isArray(person.user_accounts)
    ? person.user_accounts[0] ?? null
    : person.user_accounts
  return {
    id: person.id,
    nickname: person.nickname,
    email: account?.email ?? null,
  }
}

async function loadStatusCounts(): Promise<Record<ReportStatus, number>> {
  const supabase = createAdminClient()

  // 카운트만 필요하므로 행을 끌어오지 않는다.
  const entries = await Promise.all(
    REPORT_STATUS_ORDER.map(async (status) => {
      const { count } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
      return [status, count ?? 0] as const
    })
  )

  return {
    pending: entries.find(([status]) => status === 'pending')?.[1] ?? 0,
    resolved: entries.find(([status]) => status === 'resolved')?.[1] ?? 0,
    rejected: entries.find(([status]) => status === 'rejected')?.[1] ?? 0,
  }
}

export async function getReportQueue(params: ReportQueueParams): Promise<ReportQueue> {
  await requireAdmin()

  const supabase = createAdminClient()
  const page = Math.max(1, params.page)
  const offset = (page - 1) * REPORT_PAGE_SIZE

  let query = supabase.from('reports').select(QUEUE_SELECT, { count: 'exact' })

  if (isReportStatus(params.status)) query = query.eq('status', params.status)
  if (isReportTargetType(params.targetType)) query = query.eq('target_type', params.targetType)
  if (isReportReason(params.reason)) query = query.eq('reason', params.reason)
  if (params.targetId) query = query.eq('target_id', params.targetId)

  // 대기 목록은 오래된 신고부터 — 방치를 막는다. 처리가 끝난 목록은 최근순.
  const oldestFirst = params.status === ENUM_REPORT_STATUS.PENDING

  const { data, count, error } = await query
    .order('created_at', { ascending: oldestFirst })
    .order('id', { ascending: oldestFirst })
    .range(offset, offset + REPORT_PAGE_SIZE - 1)

  if (error) throw new Error(`신고 목록 조회 실패: ${error.message}`)

  const rows = ((data ?? []) as unknown as RawQueueRow[]).map((row) => ({
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetUserId: row.target_user_id,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    reporter: toReportPerson(row.reporter),
    targetUser: toReportPerson(row.targetUser),
    resolverNickname: row.resolver?.nickname ?? null,
  }))

  const total = count ?? 0

  return {
    rows,
    total,
    totalPages: Math.max(1, Math.ceil(total / REPORT_PAGE_SIZE)),
    statusCounts: await loadStatusCounts(),
  }
}
