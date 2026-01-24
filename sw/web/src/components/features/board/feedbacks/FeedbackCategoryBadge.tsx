import type { FeedbackCategory } from '@/types/database'
import { FEEDBACK_CATEGORY_LABELS, FEEDBACK_CATEGORY_COLORS } from '@/constants/board'

interface FeedbackCategoryBadgeProps {
  category: FeedbackCategory
}

export default function FeedbackCategoryBadge({ category }: FeedbackCategoryBadgeProps) {
  return (
    <span className={`
      inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border
      ${FEEDBACK_CATEGORY_COLORS[category]}
    `}>
      {FEEDBACK_CATEGORY_LABELS[category]}
    </span>
  )
}
