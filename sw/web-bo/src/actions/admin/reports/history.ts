'use server'

import { createAdminClient } from '@/lib/db/admin'
import { requireAdmin } from '@/lib/admin-auth'
import { ENUM_REPORT_STATUS } from '@/constants/moderation'

// 상세 화면의 곁 정보 — 같은 대상·같은 신고자·같은 대상 작성자의 신고 이력과 누적 건수.
// 누적 건수는 행을 끌어오지 않고 카운트로만 구한다. 목록은 최근 5건으로 끊는다.

const HISTORY_LIMIT = 5

export interface ReportHistoryItem {
  id: string
  targetType: string
  reason: string
  status: string
  createdAt: string
}

export interface ReportContext {
  // 같은 대상에 쌓인 신고 건수(이 건 포함)
  stackedCount: number
  sameTarget: ReportHistoryItem[]
  // 신고자가 지금까지 낸 신고 건수
  reporterFiledCount: number
  reporterPendingCount: number
  reporterFiled: ReportHistoryItem[]
  // 대상 작성자가 지금까지 받은 신고 건수
  targetUserReceivedCount: number
  targetUserReceived: ReportHistoryItem[]
  // 다른 사용자가 대상 작성자를 차단한 수. 일반 클라이언트로는 못 읽어 service-role 로 센다.
  targetUserBlockedByCount: number
}

export interface ReportContextParams {
  reportId: string
  targetType: string
  targetId: string
  reporterId: string
  targetUserId: string | null
}

interface RawHistoryRow {
  id: string
  target_type: string
  reason: string
  status: string
  created_at: string
}

const HISTORY_SELECT = 'id, target_type, reason, status, created_at'

function toItems(data: unknown): ReportHistoryItem[] {
  return ((data ?? []) as RawHistoryRow[]).map((row) => ({
    id: row.id,
    targetType: row.target_type,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
  }))
}

export async function getReportContext(params: ReportContextParams): Promise<ReportContext> {
  await requireAdmin()

  const db = createAdminClient()
  const { reportId, targetType, targetId, reporterId, targetUserId } = params

  const stacked = db
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('target_type', targetType)
    .eq('target_id', targetId)

  const sameTarget = db
    .from('reports')
    .select(HISTORY_SELECT)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .neq('id', reportId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(HISTORY_LIMIT)

  const reporterFiledCount = db
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_id', reporterId)

  const reporterPendingCount = db
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_id', reporterId)
    .eq('status', ENUM_REPORT_STATUS.PENDING)

  const reporterFiled = db
    .from('reports')
    .select(HISTORY_SELECT)
    .eq('reporter_id', reporterId)
    .neq('id', reportId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(HISTORY_LIMIT)

  const [stackedResult, sameTargetResult, filedCount, pendingCount, filedList] = await Promise.all([
    stacked,
    sameTarget,
    reporterFiledCount,
    reporterPendingCount,
    reporterFiled,
  ])

  const context: ReportContext = {
    stackedCount: stackedResult.count ?? 0,
    sameTarget: toItems(sameTargetResult.data),
    reporterFiledCount: filedCount.count ?? 0,
    reporterPendingCount: pendingCount.count ?? 0,
    reporterFiled: toItems(filedList.data),
    targetUserReceivedCount: 0,
    targetUserReceived: [],
    targetUserBlockedByCount: 0,
  }

  if (!targetUserId) return context

  const [receivedCount, receivedList, blockedCount] = await Promise.all([
    db
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('target_user_id', targetUserId),
    db
      .from('reports')
      .select(HISTORY_SELECT)
      .eq('target_user_id', targetUserId)
      .neq('id', reportId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(HISTORY_LIMIT),
    db.from('blocks').select('id', { count: 'exact', head: true }).eq('blocked_id', targetUserId),
  ])

  return {
    ...context,
    targetUserReceivedCount: receivedCount.count ?? 0,
    targetUserReceived: toItems(receivedList.data),
    targetUserBlockedByCount: blockedCount.count ?? 0,
  }
}
