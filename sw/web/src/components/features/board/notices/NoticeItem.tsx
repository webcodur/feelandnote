import Link from 'next/link'
import { Pin, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { NoticeWithAuthor } from '@/types/database'

interface NoticeItemProps {
  notice: NoticeWithAuthor
}

export default function NoticeItem({ notice }: NoticeItemProps) {
  return (
    <Link
      href={`/board/notice/${notice.id}`}
      className="block p-4 bg-bg-card border border-border rounded-xl hover:border-accent/50 hover:bg-bg-card/80"
    >
      <div className="flex items-start gap-3">
        {notice.is_pinned && (
          <Pin size={16} className="text-accent flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-text-primary truncate">
            {notice.title}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
            <span>{notice.author.nickname}</span>
            <span>·</span>
            <span>
              {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true, locale: ko })}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {notice.view_count}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
