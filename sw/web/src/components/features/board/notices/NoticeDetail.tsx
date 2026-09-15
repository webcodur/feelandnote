'use client'

import { Link, useRouter } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowLeft, Edit3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import type { NoticeWithAuthor, BoardCommentWithAuthor } from '@/types/database'
import { deleteNotice } from '@/actions/board/notices'
import { LaurelIcon } from '@/components/ui/icons/neo-pantheon/LaurelIcon'
import CommentSection from '../shared/CommentSection'
import { NoticeBody, NoticeMeta } from './NoticeContent'
import { resolveLocale } from '@/types/locale'

interface NoticeDetailProps {
  notice: NoticeWithAuthor
  initialComments: BoardCommentWithAuthor[]
  isAdmin?: boolean
  currentUserId?: string
}

export default function NoticeDetail({
  notice,
  initialComments,
  isAdmin = false,
  currentUserId
}: NoticeDetailProps) {
  const router = useRouter()
  const t = useTranslations('board')
  const tError = useTranslations('actionErrors')
  const locale = resolveLocale(useLocale())

  const handleDelete = async () => {
    if (!confirm(t('notice.deleteConfirm'))) return
    const result = await deleteNotice(notice.id)
    if (result.success) {
      router.push('/agora/board/notice')
    } else {
      alert(tError(result.error))
    }
  }

  return (
    <article>
      <Link
        href="/agora/board/notice"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent font-serif"
      >
        <ArrowLeft size={16} />
        {t('backToList')}
      </Link>

      <header className="mt-5 md:mt-6 pb-5 md:pb-6 border-b border-white/10">
        {/* 고정 배지·관리자 버튼은 있을 때만 줄을 차지한다 */}
        {(notice.is_pinned || isAdmin) && (
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              {notice.is_pinned && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-cinzel tracking-wider rounded-full bg-accent/10 text-accent border border-accent/30">
                  <LaurelIcon size={12} color="#d4af37" strokeWidth={2} />
                  PINNED
                </span>
              )}
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Link href={`/agora/board/notice/${notice.id}/edit`}>
                  <Button variant="ghost" size="sm" className="font-serif">
                    <Edit3 size={14} />
                    {t('edit')}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-400 hover:text-red-300 font-serif"
                >
                  <Trash2 size={14} />
                  {t('delete')}
                </Button>
              </div>
            )}
          </div>
        )}

        <h1 className="text-[22px] md:text-3xl font-serif font-bold leading-snug text-text-primary break-keep">
          {notice.title}
        </h1>

        <NoticeMeta
          author={notice.author?.nickname}
          createdAt={notice.created_at}
          viewCount={notice.view_count}
          locale={locale}
          className="mt-3"
        />
      </header>

      <NoticeBody content={notice.content} className="py-7 md:py-10" />

      <div className="pt-8 border-t border-white/10">
        <CommentSection
          boardType="NOTICE"
          postId={notice.id}
          initialComments={initialComments}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      </div>
    </article>
  )
}
