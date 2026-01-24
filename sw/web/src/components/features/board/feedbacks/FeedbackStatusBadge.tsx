import type { FeedbackStatus } from '@/types/database'
import { FEEDBACK_STATUS_LABELS, FEEDBACK_STATUS_COLORS } from '@/constants/board'

interface FeedbackStatusBadgeProps {
  status: FeedbackStatus
}

export default function FeedbackStatusBadge({ status }: FeedbackStatusBadgeProps) {
  return (
    <span className={`
      inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border
      ${FEEDBACK_STATUS_COLORS[status]}
    `}>
      {FEEDBACK_STATUS_LABELS[status]}
    </span>
  )
}
