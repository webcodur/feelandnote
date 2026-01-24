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
      className={`
        group block relative p-4 rounded-lg
        bg-bg-card/60 backdrop-blur-sm
        border border-accent-dim/20
        hover:border-accent/40 hover:bg-bg-card/80
        transition-all duration-200
      `}
    >
      {/* 호버 시 코너 장식 */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-accent/0 group-hover:border-accent/30 transition-colors rounded-tl" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-accent/0 group-hover:border-accent/30 transition-colors rounded-tr" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-accent/0 group-hover:border-accent/30 transition-colors rounded-bl" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-accent/0 group-hover:border-accent/30 transition-colors rounded-br" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <FeedbackCategoryBadge category={feedback.category} />
            <FeedbackStatusBadge status={feedback.status} />
          </div>
          <h3 className="text-sm font-serif font-medium text-text-primary truncate group-hover:text-accent transition-colors">
            {feedback.title}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
            <span className="font-serif">{feedback.author.nickname}</span>
            <span className="text-accent-dim/50">·</span>
            <span>
              {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true, locale: ko })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
