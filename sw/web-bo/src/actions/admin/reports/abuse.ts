'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'
import { REPORT_ABUSE_SCAN_LIMIT } from '@/constants/moderation'
import { reportTargetKey } from '@/lib/report-targets'

// 반복 신고·악용 탐지 집계.
// 지금 보고 있는 페이지에 등장한 사람·대상만 훑는다(최대 20종). 전수 select 는 하지 않는다.
// 🔴 그래도 한 사람에게 신고가 수백 건 쌓이면 응답이 잘릴 수 있으므로 상한에 닿으면
//    숫자를 정상값으로 위장하지 않고 truncated 를 켜서 화면에 "일부 생략"을 드러낸다.

export interface ReportAbuseSignals {
  // 신고 대상 작성자가 지금까지 받은 신고 건수
  receivedByUser: Record<string, number>
  // 그중 아직 처리되지 않은 건수
  pendingByUser: Record<string, number>
  // 신고자가 지금까지 낸 신고 건수
  filedByReporter: Record<string, number>
  // 같은 대상(종류:번호)에 쌓인 신고 건수
  stackedByTarget: Record<string, number>
  truncated: boolean
}

export interface ReportAbuseScope {
  targetUserIds: readonly string[]
  reporterIds: readonly string[]
  targets: readonly { targetType: string; targetId: string }[]
}

const EMPTY_SIGNALS: ReportAbuseSignals = {
  receivedByUser: {},
  pendingByUser: {},
  filedByReporter: {},
  stackedByTarget: {},
  truncated: false,
}

function bump(bucket: Record<string, number>, key: string) {
  bucket[key] = (bucket[key] ?? 0) + 1
}

interface ScanRow {
  reporter_id: string | null
  target_user_id: string | null
  target_type: string
  target_id: string
  status: string
}

// 한 번의 스캔. 상한에 닿았는지도 함께 돌려준다.
async function scan(
  column: 'target_user_id' | 'reporter_id' | 'target_id',
  values: readonly string[]
): Promise<{ rows: ScanRow[]; truncated: boolean }> {
  if (values.length === 0) return { rows: [], truncated: false }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reports')
    .select('reporter_id, target_user_id, target_type, target_id, status')
    .in(column, values)
    .order('id', { ascending: true })
    .limit(REPORT_ABUSE_SCAN_LIMIT)

  if (error) throw new Error(`신고 집계 실패: ${error.message}`)

  const rows = (data ?? []) as unknown as ScanRow[]
  return { rows, truncated: rows.length >= REPORT_ABUSE_SCAN_LIMIT }
}

export async function getReportAbuseSignals(
  scope: ReportAbuseScope
): Promise<ReportAbuseSignals> {
  await requireAdmin()

  const targetUserIds = Array.from(new Set(scope.targetUserIds)).filter(Boolean)
  const reporterIds = Array.from(new Set(scope.reporterIds)).filter(Boolean)
  const targetIds = Array.from(new Set(scope.targets.map((target) => target.targetId))).filter(
    Boolean
  )

  if (targetUserIds.length === 0 && reporterIds.length === 0 && targetIds.length === 0) {
    return EMPTY_SIGNALS
  }

  const [byUser, byReporter, byTarget] = await Promise.all([
    scan('target_user_id', targetUserIds),
    scan('reporter_id', reporterIds),
    scan('target_id', targetIds),
  ])

  const signals: ReportAbuseSignals = {
    receivedByUser: {},
    pendingByUser: {},
    filedByReporter: {},
    stackedByTarget: {},
    truncated: byUser.truncated || byReporter.truncated || byTarget.truncated,
  }

  for (const row of byUser.rows) {
    if (!row.target_user_id) continue
    bump(signals.receivedByUser, row.target_user_id)
    if (row.status === 'pending') bump(signals.pendingByUser, row.target_user_id)
  }

  for (const row of byReporter.rows) {
    if (!row.reporter_id) continue
    bump(signals.filedByReporter, row.reporter_id)
  }

  // 같은 번호가 다른 종류에서 쓰일 수 있으므로 종류까지 묶어 센다.
  for (const row of byTarget.rows) {
    bump(signals.stackedByTarget, reportTargetKey(row.target_type, row.target_id))
  }

  return signals
}
