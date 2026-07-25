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
}

const isNew = (dateStr: string) =>
  Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000

export default function FreePostItem({ post }: FreePostItemProps) {
  const t = useTranslations('board')

  return (
    <Link
      href={`/agora/board/free/${post.id}`}
      className="group block relative p-4 rounded-lg bg-bg-card/60 backdrop-blur-sm border border-accent-dim/20 hover:border-accent/40 hover:bg-bg-card/80"
    >
      {/* 호버 시 코너 장식 */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-accent/0 group-hover:border-accent/30 transition-colors rounded-tl" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-accent/0 group-hover:border-accent/30 transition-colors rounded-tr" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-accent/0 group-hover:border-accent/30 transition-colors rounded-bl" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-accent/0 group-hover:border-accent/30 transition-colors rounded-br" />

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-serif font-medium text-text-primary truncate group-hover:text-accent">
          {post.title}
          {isNew(post.created_at) && (
            <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-sans font-bold leading-none rounded bg-accent/20 text-accent align-middle">
              N
            </span>
          )}
        </h3>
        <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
          <div className="flex items-center gap-1.5">
            <FreeAvatar item={post} anonymousLabel={t('free.anonymous')} size={20} />
            <span className="font-serif">{freeDisplayName(post, t('free.anonymous'))}</span>
          </div>
          <span className="text-accent-dim/50">·</span>
          <span>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
          </span>
          <span className="text-accent-dim/30">
            ({formatKST(post.created_at, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })})
          </span>

          <span className="text-accent-dim/50">·</span>
          <span className="flex items-center gap-1">
            <Eye size={12} className="text-accent-dim" />
            {post.view_count}
          </span>
          {(post.comment_count ?? 0) > 0 && (
            <>
              <span className="text-accent-dim/50">·</span>
              <span className="flex items-center gap-1">
                <MessageSquare size={12} className="text-accent-dim" />
                {post.comment_count}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
