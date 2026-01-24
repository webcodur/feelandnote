'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Edit3 } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui'
import type { FeedbackWithDetails } from '@/types/database'
import { deleteFeedback } from '@/actions/board/feedbacks'
import FeedbackCategoryBadge from './FeedbackCategoryBadge'
import FeedbackStatusBadge from './FeedbackStatusBadge'

interface FeedbackDetailProps {
  feedback: FeedbackWithDetails
  isAuthor: boolean
}

export default function FeedbackDetail({ feedback, isAuthor }: FeedbackDetailProps) {
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
    <div>
      {/* 뒤로가기 */}
      <Link
        href="/board/feedback"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6"
      >
        <ArrowLeft size={16} />
        목록으로
      </Link>

      {/* 헤더 */}
      <div className="border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FeedbackCategoryBadge category={feedback.category} />
          <FeedbackStatusBadge status={feedback.status} />
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-3">
          {feedback.title}
        </h1>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-text-tertiary">
            <span>{feedback.author.nickname}</span>
            <span>·</span>
            <span>{format(new Date(feedback.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
          </div>

          {/* 수정/삭제 버튼 */}
          {canEdit && (
            <div className="flex items-center gap-2">
              <Link href={`/board/feedback/${feedback.id}/edit`}>
                <Button variant="ghost" size="sm">
                  <Edit3 size={14} />
                  수정
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 size={14} />
                삭제
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="mb-8">
        <div className="whitespace-pre-wrap text-text-secondary leading-relaxed">
          {feedback.content}
        </div>
      </div>

      {/* 관리자 답변 */}
      {feedback.admin_comment && (
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-accent">관리자 답변</span>
            {feedback.resolved_at && (
              <span className="text-xs text-text-tertiary">
                {format(new Date(feedback.resolved_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
              </span>
            )}
          </div>
          <div className="whitespace-pre-wrap text-sm text-text-secondary leading-relaxed">
            {feedback.admin_comment}
          </div>
        </div>
      )}
    </div>
  )
}
