import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import {
  reportReasonLabel,
  reportStatusBadge,
  reportStatusLabel,
  reportTargetTypeLabel,
} from '@/constants/moderation'
import type { ReportHistoryItem } from '@/actions/admin/reports/history'

interface HistoryGroup {
  title: string
  emptyText: string
  items: readonly ReportHistoryItem[]
}

interface ReportHistoryCardProps {
  groups: readonly HistoryGroup[]
}

export default function ReportHistoryCard({ groups }: ReportHistoryCardProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-6 space-y-5">
      <h3 className="text-lg font-semibold text-text-primary">관련 신고 이력</h3>

      {groups.map((group) => (
        <div key={group.title} className="space-y-2">
          <p className="text-sm font-medium text-text-secondary">{group.title}</p>

          {group.items.length === 0 && <p className="text-sm text-text-dim">{group.emptyText}</p>}

          {group.items.map((item) => (
            <Link
              key={item.id}
              href={`/reports/${item.id}`}
              className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-accent hover:bg-bg-secondary"
            >
              <Badge variant={reportStatusBadge(item.status)} dot>
                {reportStatusLabel(item.status)}
              </Badge>
              <span className="text-sm text-text-primary">
                {reportTargetTypeLabel(item.targetType)} · {reportReasonLabel(item.reason)}
              </span>
              <span className="text-xs text-text-secondary ms-auto">
                {new Date(item.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}
