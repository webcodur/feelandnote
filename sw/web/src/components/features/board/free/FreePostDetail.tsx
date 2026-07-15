'use client'

import { useState } from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Eye, Edit3, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui'
import type { FreePost, FreePostComment } from '@/types/database'
import { deleteFreePost } from '@/actions/board/free'
import { freeDisplayName } from '@/lib/board/freeDisplay'
import PasswordPromptModal from './PasswordPromptModal'
import FreeCommentSection from './FreeCommentSection'
import FreeAvatar from './FreeAvatar'

interface FreePostDetailProps {
  post: FreePost
  initialComments: FreePostComment[]
  currentUserId?: string
  isAdmin?: boolean
  isLoggedIn: boolean
}

export default function FreePostDetail({
  post,
  initialComments,
  currentUserId,
  isAdmin = false,
  isLoggedIn,
}: FreePostDetailProps) {
  const router = useRouter()
  const t = useTranslations('board')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isAnonPost = !post.author_id
  const isOwner = !!post.author_id && post.author_id === currentUserId
  const canManage = isAnonPost || isOwner || isAdmin

  const doDelete = async (password?: string) => {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteFreePost({ id: post.id, password })
    if (result.success) {
      router.push('/agora/board/free')
    } else {
      setDeleteError(result.message)
      setDeleting(false)
    }
  }

  const handleDeleteClick = () => {
    if (isAnonPost) {
      // 익명 글: 비밀번호 확인
      setDeleteError(null)
      setDeleteOpen(true)
    } else if (confirm(t('free.deleteConfirm'))) {
      // 계정 글(본인/관리자): 바로 삭제
      doDelete()
    }
  }

  return (
    <div className="relative">
      {/* 뒤로가기 */}
      <Link
        href="/agora/board/free"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent font-serif mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        {t('backToList')}
      </Link>

      {/* 헤더 */}
      <div className="relative mb-8">
        {/* 상단 장식선 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-accent-dim/50 to-transparent" />
          <div className="flex-1 h-px bg-gradient-to-l from-accent-dim/50 to-transparent" />
        </div>

        {/* 수정·삭제 (권한 있는 경우만 노출, 익명 글은 누구나 비밀번호로) */}
        {canManage && (
          <div className="flex items-center justify-end mb-4">
            <div className="flex items-center gap-2">
              <Link href={`/agora/board/free/${post.id}/edit`}>
                <Button variant="ghost" size="sm" className="font-serif">
                  <Edit3 size={14} />
                  {t('edit')}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                className="text-red-400 hover:text-red-300 font-serif"
              >
                <Trash2 size={14} />
                {t('delete')}
              </Button>
            </div>
          </div>
        )}

        {/* 제목 */}
        <h1 className="text-xl md:text-2xl font-serif font-bold text-text-primary mb-4 leading-tight">
          {post.title}
        </h1>

        {/* 메타 */}
        <div className="flex items-center gap-3 text-sm text-text-tertiary pb-4 border-b border-accent-dim/20">
          <div className="flex items-center gap-2">
            <FreeAvatar item={post} anonymousLabel={t('free.anonymous')} size={32} />
            <span className="font-serif text-text-secondary">{freeDisplayName(post, t('free.anonymous'))}</span>
          </div>
          <span className="text-accent-dim/50">·</span>
          <span>{format(new Date(post.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
          <span className="text-accent-dim/50">·</span>
          <span className="flex items-center gap-1">
            <Eye size={14} className="text-accent-dim" />
            {post.view_count}
          </span>
        </div>
      </div>

      {/* 본문 */}
      <div className="relative py-6">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-accent-dim/30 via-accent-dim/10 to-transparent" />
        <div className="pl-6">
          <div className="whitespace-pre-wrap text-text-secondary leading-relaxed font-serif">
            {post.content}
          </div>
        </div>
      </div>

      {/* 하단 장식 */}
      <div className="flex items-center justify-center gap-4 py-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-accent-dim/20" />
        <div className="text-accent-dim/30 text-xs">✦ ✦ ✦</div>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-accent-dim/20" />
      </div>

      {/* 댓글 */}
      <FreeCommentSection
        postId={post.id}
        initialComments={initialComments}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        isLoggedIn={isLoggedIn}
      />

      {/* 익명 글 삭제 비밀번호 모달 */}
      <PasswordPromptModal
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setDeleteError(null)
        }}
        onConfirm={doDelete}
        isLoading={deleting}
        error={deleteError}
        description={t('free.deleteConfirm')}
      />
    </div>
  )
}
