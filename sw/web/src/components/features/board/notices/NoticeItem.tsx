'use client'

import { Link } from "@/i18n/navigation"
import { useLocale, useTranslations } from 'next-intl'
import { Eye, MessageSquare } from 'lucide-react'
import type { NoticeWithAuthor } from '@/types/database'
import { LaurelIcon } from '@/components/ui/icons/neo-pantheon/LaurelIcon'
import { formatBoardRelativeTime, formatBoardShortDateTime } from '@/lib/board/boardDate'
import { isScheduledNotice } from '@/lib/board/noticeSchedule'
import { resolveLocale } from '@/types/locale'
import { Dot } from './NoticeContent'

interface NoticeItemProps {
  notice: NoticeWithAuthor
}

const isNew = (dateStr: string) =>
  Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000

export default function NoticeItem({ notice }: NoticeItemProps) {
  const locale = resolveLocale(useLocale())
  const t = useTranslations('board')

  // 목록에 예약분이 섞여 오는 건 관리자 화면뿐이다 — 방문자에게는 애초에 오지 않는다.
  const scheduled = isScheduledNotice(notice.created_at)
  const author = notice.author?.nickname

  return (
    <Link
      href={`/agora/board/notice/${notice.id}`}
      /* 테두리·배경·제목색은 즉각 축이다 — transition을 얹지 않는다(ui-hover) */
      className={`
        group block rounded-lg px-4 py-3.5 sm:px-5 sm:py-4
        bg-white/[0.03] border border-white/10
        hover:border-accent/50 hover:bg-white/[0.06]
        ${notice.is_pinned ? 'border-l-2 border-l-accent' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {notice.is_pinned && (
          <div className="flex-shrink-0 mt-0.5">
            <LaurelIcon size={18} color="#d4af37" strokeWidth={1.5} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="flex items-center gap-2 text-[15px] sm:text-base font-serif font-medium text-text-primary group-hover:text-accent">
            <span className="truncate">{notice.title}</span>
            {scheduled ? (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-sans font-bold leading-none rounded border border-accent/40 text-accent">
                {t('notice.scheduledBadge')}
              </span>
            ) : isNew(notice.created_at) && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-sans font-bold leading-none rounded bg-accent text-bg-main">
                N
              </span>
            )}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-text-tertiary">
            {author && (
              <>
                <span className="text-text-secondary">{author}</span>
                <Dot />
              </>
            )}
            <span className="text-text-secondary">{formatBoardRelativeTime(notice.created_at, locale)}</span>
            <span>({formatBoardShortDateTime(notice.created_at, locale)})</span>
            <Dot />
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {notice.view_count}
            </span>
            {(notice.comment_count ?? 0) > 0 && (
              <>
                <Dot />
                <span className="flex items-center gap-1">
                  <MessageSquare size={12} />
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
