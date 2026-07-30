import Link from 'next/link'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import {
  REPORT_REASON_CONFIG,
  REPORT_REASON_ORDER,
  REPORT_STATUS_CONFIG,
  REPORT_STATUS_ORDER,
  REPORT_TARGET_TYPE_LABEL,
  REPORT_TARGET_TYPE_ORDER,
  type ReportStatus,
} from '@/constants/moderation'

interface ReportFiltersProps {
  status: string
  targetType: string
  reason: string
  targetId: string
  statusCounts: Record<ReportStatus, number>
}

const ALL = 'all'

const SELECT_CLASS =
  'px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none'

const TAB_BASE =
  'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border hover:border-accent hover:text-accent'

export default function ReportFilters({
  status,
  targetType,
  reason,
  targetId,
  statusCounts,
}: ReportFiltersProps) {
  const tabs = [
    ...REPORT_STATUS_ORDER.map((value) => ({
      value,
      label: REPORT_STATUS_CONFIG[value].label,
      count: statusCounts[value],
    })),
    {
      value: ALL,
      label: '전체',
      count: REPORT_STATUS_ORDER.reduce((sum, key) => sum + statusCounts[key], 0),
    },
  ]

  return (
    <div className="space-y-3">
      {/* 상태 탭 — 대기 중을 먼저 본다 */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = status === tab.value
          return (
            <Link
              key={tab.value}
              href={`/reports?status=${tab.value}`}
              className={`${TAB_BASE} ${
                active
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'bg-bg-card border-border text-text-secondary'
              }`}
            >
              {tab.label}
              <span className="text-xs">{tab.count.toLocaleString()}</span>
            </Link>
          )
        })}
      </div>

      {/* 대상 종류·사유 */}
      <div className="bg-bg-card border border-border rounded-lg p-3 md:p-4">
        <form className="flex flex-wrap items-center gap-2 md:gap-3">
          <input type="hidden" name="status" value={status} />
          {targetId && <input type="hidden" name="targetId" value={targetId} />}

          <select name="targetType" defaultValue={targetType} className={SELECT_CLASS}>
            <option value={ALL}>모든 대상 종류</option>
            {REPORT_TARGET_TYPE_ORDER.map((value) => (
              <option key={value} value={value}>
                {REPORT_TARGET_TYPE_LABEL[value]}
              </option>
            ))}
          </select>

          <select name="reason" defaultValue={reason} className={SELECT_CLASS}>
            <option value={ALL}>모든 사유</option>
            {REPORT_REASON_ORDER.map((value) => (
              <option key={value} value={value}>
                {REPORT_REASON_CONFIG[value].label}
              </option>
            ))}
          </select>

          <Button type="submit" size="sm">
            적용
          </Button>

          {targetId && (
            <div className="flex items-center gap-2">
              <Badge variant="info">한 대상만 보는 중</Badge>
              <Link
                href={`/reports?status=${status}`}
                className="text-sm text-accent hover:underline"
              >
                해제
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
