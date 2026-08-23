'use client'

import { Link } from "@/i18n/navigation"
import { useLocale } from 'next-intl'
import { Eye, MessageSquare } from 'lucide-react'
import type { NoticeWithAuthor } from '@/types/database'
import { LaurelIcon } from '@/components/ui/icons/neo-pantheon/LaurelIcon'
import { formatBoardRelativeTime, formatBoardShortDateTime } from '@/lib/board/boardDate'
import { resolveLocale } from '@/types/locale'

interface NoticeItemProps {
  notice: NoticeWithAuthor
}

const isNew = (dateStr: string) =>
  Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000

export default function NoticeItem({ notice }: NoticeItemProps) {
  const locale = resolveLocale(useLocale())

  return (
    <Link
      href={`/agora/board/notice/${notice.id}`}
      /* 테두리·배경은 즉각 축이다 — transition을 얹지 않는다(ui-hover).
         곁들이는 연출(모서리 장식)은 아래 자식 엘리먼트가 따로 맡는다 */
      className={`
        group block relative p-4 rounded-lg
        bg-bg-card/60 backdrop-blur-sm
        border border-accent-dim/20
        hover:border-accent/40 hover:bg-bg-card/80
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
          <h3 className="text-sm font-serif font-medium text-text-primary truncate group-hover:text-accent">
            {notice.title}
            {isNew(notice.created_at) && (
              <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-sans font-bold leading-none rounded bg-accent/20 text-accent align-middle">
                N
              </span>
            )}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="font-serif">{notice.author.nickname}</span>
            <span className="text-accent-dim/50">·</span>
            <span>
              {formatBoardRelativeTime(notice.created_at, locale)}
            </span>
            <span className="text-accent-dim/30">
              ({formatBoardShortDateTime(notice.created_at, locale)})
            </span>

            <span className="text-accent-dim/50">·</span>
            <span className="flex items-center gap-1">
              <Eye size={12} className="text-accent-dim" />
              {notice.view_count}
            </span>
            {(notice.comment_count ?? 0) > 0 && (
              <>
                <span className="text-accent-dim/50">·</span>
                <span className="flex items-center gap-1">
                  <MessageSquare size={12} className="text-accent-dim" />
                  {notice.comment_count}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
