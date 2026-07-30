import type { Metadata } from 'next'
import { AlertTriangle } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Badge from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { getReportQueue } from '@/actions/admin/reports/list'
import { getReportAbuseSignals } from '@/actions/admin/reports/abuse'
import { ENUM_REPORT_STATUS, REPORT_PAGE_SIZE } from '@/constants/moderation'
import ReportFilters from './ReportFilters'
import ReportQueueTable from './ReportQueueTable'

export const metadata: Metadata = { title: '신고 관리' }

interface PageProps {
  searchParams: Promise<{
    page?: string
    status?: string
    targetType?: string
    reason?: string
    targetId?: string
  }>
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  // 기본은 대기 목록이다 — 신고 관리로 들어오면 처리할 것이 먼저 보여야 한다.
  const status = params.status || ENUM_REPORT_STATUS.PENDING
  const targetType = params.targetType || 'all'
  const reason = params.reason || 'all'
  const targetId = params.targetId || ''

  const queue = await getReportQueue({ page, status, targetType, reason, targetId })

  const signals = await getReportAbuseSignals({
    targetUserIds: queue.rows.map((row) => row.targetUserId).filter((id): id is string => !!id),
    reporterIds: queue.rows.map((row) => row.reporter?.id).filter((id): id is string => !!id),
    targets: queue.rows.map((row) => ({ targetType: row.targetType, targetId: row.targetId })),
  })

  const pendingCount = queue.statusCounts.pending
  const rangeStart = queue.total === 0 ? 0 : (page - 1) * REPORT_PAGE_SIZE + 1
  const rangeEnd = Math.min(page * REPORT_PAGE_SIZE, queue.total)

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="신고 관리"
        description={`조건에 맞는 신고 ${queue.total.toLocaleString()}건 중 ${rangeStart}~${rangeEnd}번째를 보고 있습니다`}
        badge={
          pendingCount > 0 ? (
            <Badge variant="warning" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
              처리 대기 {pendingCount.toLocaleString()}건
            </Badge>
          ) : (
            <Badge variant="success">처리 대기 없음</Badge>
          )
        }
      />

      <ReportFilters
        status={status}
        targetType={targetType}
        reason={reason}
        targetId={targetId}
        statusCounts={queue.statusCounts}
      />

      {signals.truncated && (
        <p className="text-sm text-warning-text">
          반복 신고 집계가 한 번에 볼 수 있는 분량을 넘었습니다. 아래 누적 건수는 실제보다 적을 수
          있으니 상세 화면의 수치를 기준으로 판단해주세요.
        </p>
      )}

      <ReportQueueTable rows={queue.rows} signals={signals} />

      <Pagination
        page={page}
        totalPages={queue.totalPages}
        baseHref="/reports"
        params={{
          status,
          targetType: targetType !== 'all' ? targetType : undefined,
          reason: reason !== 'all' ? reason : undefined,
          targetId: targetId || undefined,
        }}
      />
    </div>
  )
}
