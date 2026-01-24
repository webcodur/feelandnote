'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button, FormattedText } from '@/components/ui'
import type { BoardCommentWithAuthor, BoardType } from '@/types/database'
import { createComment, deleteComment } from '@/actions/board/comments'
import { MessageTabletIcon } from '@/components/ui/icons/neo-pantheon/MessageTabletIcon'

interface CommentSectionProps {
  boardType: BoardType
  postId: string
  initialComments: BoardCommentWithAuthor[]
  currentUserId?: string
  isAdmin?: boolean
}

export default function CommentSection({
  boardType,
  postId,
  initialComments,
  currentUserId,
  isAdmin = false
}: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    const result = await createComment({
      boardType,
      postId,
      content: newComment
    })

    if (result.success) {
      setComments(prev => [...prev, result.data])
      setNewComment('')
    } else {
      alert(result.message)
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return

    const result = await deleteComment({ commentId, boardType, postId })
    if (result.success) {
      setComments(prev => prev.filter(c => c.id !== commentId))
    } else {
      alert(result.message)
    }
  }

  const canDelete = (comment: BoardCommentWithAuthor) =>
    comment.author_id === currentUserId || isAdmin

  return (
    <div className="relative">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <MessageTabletIcon size={18} color="#8a732a" strokeWidth={1.5} />
        <span className="font-serif text-sm text-text-primary">
          댓글 <span className="text-accent">{comments.length}</span>
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-accent-dim/20 to-transparent" />
      </div>

      {/* 댓글 목록 */}
      <div className="space-y-4 mb-6">
        {comments.map(comment => (
          <div
            key={comment.id}
            className="group relative p-4 rounded-lg bg-bg-card/40 border border-accent-dim/10 hover:border-accent-dim/20 transition-colors"
          >
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-serif font-medium text-text-primary">
                    {comment.author.nickname}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {format(new Date(comment.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                  </span>
                </div>
                <p className="text-sm text-text-secondary whitespace-pre-wrap font-serif leading-relaxed">
                  <FormattedText text={comment.content} />
                </p>
              </div>
              {canDelete(comment) && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-center py-8">
            <MessageTabletIcon size={32} color="#8a732a" strokeWidth={1} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm text-text-tertiary font-serif">
              첫 번째 댓글을 남겨보세요
            </p>
          </div>
        )}
      </div>

      {/* 댓글 작성 폼 */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요"
            maxLength={500}
            className="flex-1 px-4 py-3 bg-bg-card/60 border border-accent-dim/20 rounded-lg text-sm text-text-primary font-serif placeholder:text-text-tertiary focus:outline-none focus:border-accent/40 transition-colors"
          />
          <Button type="submit" size="sm" disabled={isSubmitting} className="font-serif px-5">
            {isSubmitting ? '...' : '작성'}
          </Button>
        </form>
      ) : (
        <div className="text-center py-4 border border-dashed border-accent-dim/20 rounded-lg">
          <p className="text-sm text-text-tertiary font-serif">
            로그인 후 댓글을 작성할 수 있습니다
          </p>
        </div>
      )}
    </div>
  )
}
