'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Edit3 } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui'
import type { FeedbackWithDetails, BoardCommentWithAuthor } from '@/types/database'
import { deleteFeedback } from '@/actions/board/feedbacks'
import { LaurelIcon } from '@/components/ui/icons/neo-pantheon/LaurelIcon'
import FeedbackCategoryBadge from './FeedbackCategoryBadge'
import FeedbackStatusBadge from './FeedbackStatusBadge'
import CommentSection from '../shared/CommentSection'

interface FeedbackDetailProps {
  feedback: FeedbackWithDetails
  isAuthor: boolean
  initialComments: BoardCommentWithAuthor[]
  isAdmin?: boolean
  currentUserId?: string
}

export default function FeedbackDetail({
  feedback,
  isAuthor,
  initialComments,
  isAdmin = false,
  currentUserId
}: FeedbackDetailProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const canEdit = isAuthor && feedback.status === 'PENDING'

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    setIsDeleting(true)
    const result = await deleteFeedback(feedback.id)

    if (result.success) {
      router.push('/board/feedback')
    } else {
      alert(result.message)
      setIsDeleting(false)
    }
  }

  return (
    <div className="relative">
      {/* 뒤로가기 */}
      <Link
        href="/board/feedback"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent font-serif mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        목록으로
      </Link>

      {/* 헤더 영역 */}
      <div className="relative mb-8">
        {/* 상단 장식선 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-accent-dim/50 to-transparent" />
          <div className="w-1.5 h-1.5 rotate-45 bg-accent-dim/50" />
          <div className="flex-1 h-px bg-gradient-to-l from-accent-dim/50 to-transparent" />
        </div>

        {/* 배지 및 버튼 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FeedbackCategoryBadge category={feedback.category} />
            <FeedbackStatusBadge status={feedback.status} />
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Link href={`/board/feedback/${feedback.id}/edit`}>
                <Button variant="ghost" size="sm" className="font-serif">
                  <Edit3 size={14} />
                  수정
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-400 hover:text-red-300 font-serif"
              >
                <Trash2 size={14} />
                삭제
              </Button>
            </div>
          )}
        </div>

        {/* 제목 */}
        <h1 className="text-xl md:text-2xl font-serif font-bold text-text-primary mb-4 leading-tight">
          {feedback.title}
        </h1>

        {/* 메타 정보 */}
        <div className="flex items-center gap-3 text-sm text-text-tertiary pb-4 border-b border-accent-dim/20">
          <span className="font-serif text-text-secondary">{feedback.author.nickname}</span>
          <span className="text-accent-dim/50">·</span>
          <span>{format(new Date(feedback.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
        </div>
      </div>

      {/* 본문 */}
      <div className="relative py-6">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-accent-dim/30 via-accent-dim/10 to-transparent" />
        <div className="pl-6">
          <div className="whitespace-pre-wrap text-text-secondary leading-relaxed font-serif">
            {feedback.content}
          </div>
        </div>
      </div>

      {/* 관리자 답변 */}
      {feedback.admin_comment && (
        <div className="relative mt-6 p-5 rounded-lg bg-accent/5 border border-accent/20">
          {/* 코너 장식 */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-accent/40 rounded-tl" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-accent/40 rounded-tr" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-accent/40 rounded-bl" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-accent/40 rounded-br" />

          <div className="flex items-center gap-2 mb-3">
            <LaurelIcon size={16} color="#d4af37" strokeWidth={1.5} />
            <span className="text-xs font-cinzel tracking-wider text-accent">OFFICIAL RESPONSE</span>
            {feedback.resolved_at && (
              <span className="text-xs text-text-tertiary ml-2">
                {format(new Date(feedback.resolved_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
              </span>
            )}
          </div>
          <div className="whitespace-pre-wrap text-sm text-text-secondary leading-relaxed font-serif">
            {feedback.admin_comment}
          </div>
        </div>
      )}

      {/* 하단 장식 */}
      <div className="flex items-center justify-center gap-4 py-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-accent-dim/20" />
        <div className="text-accent-dim/30 text-xs">✦ ✦ ✦</div>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-accent-dim/20" />
      </div>

      {/* 댓글 */}
      <CommentSection
        boardType="FEEDBACK"
        postId={feedback.id}
        initialComments={initialComments}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </div>
  )
}
