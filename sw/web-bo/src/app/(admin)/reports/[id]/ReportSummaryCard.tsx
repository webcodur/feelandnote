import { Calendar, CheckCircle, Layers } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { reportReasonBadge, reportReasonLabel, reportTargetTypeLabel } from '@/constants/moderation'

interface ReportSummaryCardProps {
  targetType: string
  targetId: string
  reason: string
  description: string | null
  createdAt: string
  resolvedAt: string | null
  stackedCount: number
}

export default function ReportSummaryCard({
  targetType,
  targetId,
  reason,
  description,
  createdAt,
  resolvedAt,
  stackedCount,
}: ReportSummaryCardProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">신고 내용</h3>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default">{reportTargetTypeLabel(targetType)}</Badge>
        <Badge variant={reportReasonBadge(reason)}>{reportReasonLabel(reason)}</Badge>
        {stackedCount > 1 && (
          <Badge variant="info" icon={<Layers className="w-3 h-3" />}>
            같은 대상 신고 {stackedCount}건
          </Badge>
        )}
      </div>

      <div>
        <p className="text-sm text-text-secondary mb-1">신고자가 적은 설명</p>
        {description ? (
          <p className="text-sm text-text-primary whitespace-pre-wrap break-words">{description}</p>
        ) : (
          <p className="text-sm text-text-dim">따로 적지 않았습니다</p>
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1.5 text-text-secondary">
          <Calendar className="w-4 h-4" />
          신고 {new Date(createdAt).toLocaleString('ko-KR')}
        </span>
        {resolvedAt && (
          <span className="inline-flex items-center gap-1.5 text-text-secondary">
            <CheckCircle className="w-4 h-4" />
            처리 {new Date(resolvedAt).toLocaleString('ko-KR')}
          </span>
        )}
      </div>

      <code className="block text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded break-all">
        {targetId}
      </code>
    </div>
  )
}
