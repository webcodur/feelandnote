import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { FeedbackWithAuthor } from '@/types/database'
import FeedbackCategoryBadge from './FeedbackCategoryBadge'
import FeedbackStatusBadge from './FeedbackStatusBadge'

interface FeedbackItemProps {
  feedback: FeedbackWithAuthor
}

export default function FeedbackItem({ feedback }: FeedbackItemProps) {
  return (
    <Link
      href={`/board/feedback/${feedback.id}`}
      className="block p-4 bg-bg-card border border-border rounded-xl hover:border-accent/50 hover:bg-bg-card/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <FeedbackCategoryBadge category={feedback.category} />
            <FeedbackStatusBadge status={feedback.status} />
          </div>
          <h3 className="text-sm font-medium text-text-primary truncate">
            {feedback.title}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
            <span>{feedback.author.nickname}</span>
            <span>·</span>
            <span>
              {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true, locale: ko })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
