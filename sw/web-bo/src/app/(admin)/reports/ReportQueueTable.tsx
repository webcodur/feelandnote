import Link from 'next/link'
import { AlertTriangle, Layers, Repeat } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import {
  ENUM_REPORT_STATUS,
  REPORT_REPEAT_THRESHOLD,
  reportReasonBadge,
  reportReasonLabel,
  reportStatusBadge,
  reportStatusLabel,
  reportTargetTypeLabel,
} from '@/constants/moderation'
import { reportTargetKey } from '@/lib/report-targets'
import type { ReportQueueRow } from '@/actions/admin/reports/list'
import type { ReportAbuseSignals } from '@/actions/admin/reports/abuse'

interface ReportQueueTableProps {
  rows: readonly ReportQueueRow[]
  signals: ReportAbuseSignals
}

const HEADERS = ['상태', '신고일', '대상', '대상 작성자', '사유', '신고자', '반복·악용', ''] as const

const TH = 'text-center px-3 md:px-4 py-3 text-xs md:text-sm font-medium text-text-secondary'
const TD = 'px-3 md:px-4 py-3 text-xs md:text-sm text-text-secondary align-top'

function formatDay(value: string): string {
  return new Date(value).toLocaleDateString('ko-KR')
}

export default function ReportQueueTable({ rows, signals }: ReportQueueTableProps) {
  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px]">
          <thead className="bg-bg-secondary border-b border-border">
            <tr className="divide-x divide-border">
              {HEADERS.map((header, index) => (
                <th key={index} className={TH}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={HEADERS.length} className="px-6 py-12 text-center text-sm text-text-secondary">
                  조건에 맞는 신고가 없습니다
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const pending = row.status === ENUM_REPORT_STATUS.PENDING
              const stacked = signals.stackedByTarget[reportTargetKey(row.targetType, row.targetId)] ?? 0
              const received = row.targetUserId ? (signals.receivedByUser[row.targetUserId] ?? 0) : 0
              const filed = row.reporter ? (signals.filedByReporter[row.reporter.id] ?? 0) : 0

              return (
                <tr
                  key={row.id}
                  className={`divide-x divide-border hover:bg-bg-secondary/50 ${
                    pending ? 'bg-accent/5 border-s-2 border-s-accent' : 'odd:bg-white/[0.02]'
                  }`}
                >
                  <td className={`${TD} text-center`}>
                    <Badge variant={reportStatusBadge(row.status)} dot>
                      {reportStatusLabel(row.status)}
                    </Badge>
                  </td>
                  <td className={`${TD} text-center whitespace-nowrap`}>{formatDay(row.createdAt)}</td>
                  <td className={TD}>
                    <p className="text-text-primary">{reportTargetTypeLabel(row.targetType)}</p>
                    <code className="text-xs text-text-secondary break-all">{row.targetId}</code>
                  </td>
                  <td className={TD}>
                    {row.targetUser ? (
                      <Link
                        href={`/users/${row.targetUser.id}`}
                        className="text-text-primary hover:text-accent hover:underline"
                      >
                        {row.targetUser.nickname || '닉네임 없음'}
                      </Link>
                    ) : (
                      <span className="text-text-dim">미기록</span>
                    )}
                  </td>
                  <td className={`${TD} text-center`}>
                    <Badge variant={reportReasonBadge(row.reason)}>{reportReasonLabel(row.reason)}</Badge>
                  </td>
                  <td className={TD}>
                    {row.reporter ? (
                      <Link
                        href={`/users/${row.reporter.id}`}
                        className="text-text-primary hover:text-accent hover:underline"
                      >
                        {row.reporter.nickname || '닉네임 없음'}
                      </Link>
                    ) : (
                      <span className="text-text-dim">탈퇴/미상</span>
                    )}
                  </td>
                  <td className={TD}>
                    <div className="flex flex-col items-start gap-1">
                      {stacked > 1 && (
                        <Link
                          href={`/reports?status=all&targetId=${encodeURIComponent(row.targetId)}`}
                          className="hover:underline"
                        >
                          <Badge variant="info" icon={<Layers className="w-3 h-3" />}>
                            같은 대상 {stacked}건
                          </Badge>
                        </Link>
                      )}
                      {received >= REPORT_REPEAT_THRESHOLD && (
                        <Badge variant="danger" icon={<AlertTriangle className="w-3 h-3" />}>
                          작성자 누적 {received}건
                        </Badge>
                      )}
                      {filed >= REPORT_REPEAT_THRESHOLD && (
                        <Badge variant="warning" icon={<Repeat className="w-3 h-3" />}>
                          신고자 누적 {filed}건
                        </Badge>
                      )}
                      {stacked <= 1 && received < REPORT_REPEAT_THRESHOLD && filed < REPORT_REPEAT_THRESHOLD && (
                        <span className="text-text-dim">-</span>
                      )}
                    </div>
                  </td>
                  <td className={`${TD} text-center whitespace-nowrap`}>
                    <Link href={`/reports/${row.id}`} className="text-accent hover:underline">
                      처리하기
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
