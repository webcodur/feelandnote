'use server'

// 내가 낸 신고 내역 조회. 처리 상태를 사용자에게 보여주기 위한 것이다.
// 본인 데이터라 캐시하지 않는다.

import { createClient } from '@/lib/db/server'
import { type ActionResult, failure, success, handleDatabaseError } from '@/lib/errors'
import {
  MODERATION_LIST_DEFAULT_LIMIT,
  MODERATION_LIST_MAX_LIMIT,
  type ReportReason,
  type ReportStatus,
  type ReportTargetType,
} from '@/constants/moderation'

interface GetMyReportsParams {
  limit?: number
  offset?: number
  status?: ReportStatus
}

export interface MyReport {
  id: string
  targetType: ReportTargetType
  targetId: string
  targetUserId: string | null
  reason: ReportReason
  description: string | null
  status: ReportStatus
  createdAt: string | null
  resolvedAt: string | null
  resolutionNote: string | null
}

interface GetMyReportsData {
  reports: MyReport[]
  total: number
  hasMore: boolean
}

const REPORT_COLUMNS =
  'id, target_type, target_id, target_user_id, reason, description, status, created_at, resolved_at, resolution_note'

export async function getMyReports(
  params: GetMyReportsParams = {}
): Promise<ActionResult<GetMyReportsData>> {
  const limit = Math.min(params.limit ?? MODERATION_LIST_DEFAULT_LIMIT, MODERATION_LIST_MAX_LIMIT)
  const offset = Math.max(params.offset ?? 0, 0)

  const db = await createClient()

  const {
    data: { user },
  } = await db.auth.getUser()

  if (!user) return failure('UNAUTHORIZED')

  let query = db
    .from('reports')
    .select(REPORT_COLUMNS, { count: 'exact' })
    .eq('reporter_id', user.id)

  if (params.status) {
    query = query.eq('status', params.status)
  }

  const { data, error, count } = await query
    // 동점 정렬키 함정 회피 — created_at 뒤에 id 를 2차 키로 고정한다
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return handleDatabaseError(error, { logPrefix: '[내 신고 목록 조회]' })
  }

  // DB 는 target_type·reason·status 를 text + CHECK 로 두었으므로 좁은 문자열 타입으로 좁혀 넘긴다
  const reports: MyReport[] = (data ?? []).map((row) => ({
    id: row.id,
    targetType: row.target_type as ReportTargetType,
    targetId: row.target_id,
    targetUserId: row.target_user_id,
    reason: row.reason as ReportReason,
    description: row.description,
    status: row.status as ReportStatus,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolutionNote: row.resolution_note,
  }))

  const total = count ?? 0

  return success({ reports, total, hasMore: total > offset + limit })
}
