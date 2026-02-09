import Link from 'next/link'
import { Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { formatKST } from '@/lib/utils/date'
import type { NoticeWithAuthor } from '@/types/database'
import { LaurelIcon } from '@/components/ui/icons/neo-pantheon/LaurelIcon'

interface NoticeItemProps {
  notice: NoticeWithAuthor
}

export default function NoticeItem({ notice }: NoticeItemProps) {
  return (
    <Link
      href={`/board/notice/${notice.id}`}
      className={`
        group block relative p-4 rounded-lg
        bg-bg-card/60 backdrop-blur-sm
        border border-accent-dim/20
        hover:border-accent/40 hover:bg-bg-card/80
        transition-all duration-200
        ${notice.is_pinned ? 'border-l-2 border-l-accent' : ''}
      `}
    >
      {/* 호버 시 코너 장식 */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-accent/0 group-hover:border-accent/30 transition-colors rounded-tl" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-accent/0 group-hover:border-accent/30 transition-colors rounded-tr" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-accent/0 group-hover:border-accent/30 transition-colors rounded-bl" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-accent/0 group-hover:border-accent/30 transition-colors rounded-br" />

      <div className="flex items-start gap-3">
        {notice.is_pinned && (
          <div className="flex-shrink-0 mt-0.5">
            <LaurelIcon size={18} color="#d4af37" strokeWidth={1.5} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-serif font-medium text-text-primary truncate group-hover:text-accent transition-colors">
            {notice.title}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
            <span className="font-serif">{notice.author.nickname}</span>
            <span className="text-accent-dim/50">·</span>
            <span>
              {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true, locale: ko })}
            </span>
            <span className="text-accent-dim/30">
              ({formatKST(notice.created_at, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })})
            </span>

            <span className="text-accent-dim/50">·</span>
            <span className="flex items-center gap-1">
              <Eye size={12} className="text-accent-dim" />
              {notice.view_count}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
