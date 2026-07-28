'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Eye, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { formatKST } from '@/lib/utils/date'
import { freeDisplayName } from '@/lib/board/freeDisplay'
import FreeAvatar from './FreeAvatar'
import type { FreePost } from '@/types/database'

interface FreePostItemProps {
  post: FreePost
  /** 아직 열어보지 않은 글인지 — "새 글" 딱지 표시 여부 */
  unread?: boolean
  /** 글을 열 때 알린다 — 딱지를 즉시 떼기 위함 */
  onOpen?: () => void
}

const isNew = (dateStr: string) =>
  Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000

export default function FreePostItem({ post, unread = true, onOpen }: FreePostItemProps) {
  const t = useTranslations('board')

  return (
    <div className="group/card relative rounded-lg bg-bg-card border border-white/5 transition-[border-color] duration-200">
      {/* 즉각 반응하는 왼쪽 강조 바 */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg bg-transparent group-hover/card:bg-accent/50 transition-none" />

      <Link
        href={`/agora/board/free/${post.id}`}
        onClick={onOpen}
        className="group w-full block text-left p-4 sm:p-5 hover:bg-white/[0.03] rounded-lg transition-none"
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-serif font-medium text-text-primary group-hover:text-accent flex items-center gap-2">
            <span className="truncate">{post.title}</span>
            {isNew(post.created_at) && unread && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-sans font-bold leading-none rounded bg-accent text-bg-main">
                N
              </span>
            )}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2 text-xs text-text-tertiary">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <FreeAvatar item={post} anonymousLabel={t('free.anonymous')} size={18} />
              <span className="font-serif">{freeDisplayName(post, t('free.anonymous'))}</span>
            </div>
            <span className="text-accent-dim/30 hidden sm:inline">·</span>
            <div className="flex items-center gap-1.5">
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}</span>
              <span className="text-text-tertiary/60">
                ({formatKST(post.created_at, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })})
              </span>
            </div>
            <span className="text-accent-dim/30 hidden sm:inline">·</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye size={13} className="text-accent-dim/70" />
                {post.view_count}
              </span>
              {(post.comment_count ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare size={13} className="text-accent-dim/70" />
                  {post.comment_count}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
