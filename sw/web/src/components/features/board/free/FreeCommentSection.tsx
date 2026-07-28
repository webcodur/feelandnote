'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button, FormattedText } from '@/components/ui'
import type { FreePostComment } from '@/types/database'
import { createFreeComment, deleteFreeComment } from '@/actions/board/free'
import { freeDisplayName } from '@/lib/board/freeDisplay'
import { MessageTabletIcon } from '@/components/ui/icons/neo-pantheon/MessageTabletIcon'
import { loadRememberedNickname, rememberNickname } from './useFreePostDraft'
import PasswordPromptModal from './PasswordPromptModal'
import FreeAvatar from './FreeAvatar'

interface FreeCommentSectionProps {
  postId: string
  initialComments: FreePostComment[]
  currentUserId?: string
  isAdmin?: boolean
  isLoggedIn: boolean
}

export default function FreeCommentSection({
  postId,
  initialComments,
  currentUserId,
  isAdmin = false,
  isLoggedIn,
}: FreeCommentSectionProps) {
  const t = useTranslations('board')
  const tError = useTranslations('actionErrors')
  const [comments, setComments] = useState(initialComments)
  const [nickname, setNickname] = useState('')
  const [newComment, setNewComment] = useState('')
  const [password, setPassword] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 직전에 쓴 필명을 기본값으로 — 글쓰기와 같은 값을 공유한다.
  // localStorage는 서버에 없으므로 마운트 후에 읽는다(하이드레이션 불일치 방지).
  useEffect(() => {
    const remembered = loadRememberedNickname()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 저장소(localStorage) 동기화. 초기값으로 옮기면 SSR과 값이 갈린다
    if (remembered) setNickname(remembered)
  }, [])

  // 삭제 모달 (익명 댓글용)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setError(null)
    if (!newComment.trim()) return
    if (!isLoggedIn && !/^[0-9]{4}$/.test(password)) {
      setError(t('free.passwordHint'))
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createFreeComment(
        isLoggedIn
          ? { postId, content: newComment, anonymous, nickname: anonymous ? nickname.trim() || undefined : undefined }
          : { postId, content: newComment, nickname: nickname.trim() || undefined, password },
      )

      if (result.success) {
        setComments((prev) => [...prev, result.data])
        setNewComment('')
        setPassword('')
        // 필명은 비우지 않고 기억한다 — 연달아 댓글을 달 때 다시 치지 않게
        if (!isLoggedIn || anonymous) rememberNickname(nickname)
      } else {
        setError(tError(result.error))
      }
    } catch {
      // 응답이 오지 않은 경우. 여기서 잡지 않으면 등록 버튼이 계속 눌리지 않는다
      setError(tError('UNKNOWN_ERROR'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const doDeleteComment = async (id: string, pw?: string) => {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteFreeComment({ id, postId, password: pw })
    if (result.success) {
      setComments((prev) => prev.filter((c) => c.id !== id))
      setDeleteId(null)
    } else {
      setDeleteError(tError(result.error))
    }
    setDeleting(false)
  }

  const handleDeleteClick = (comment: FreePostComment) => {
    if (!comment.author_id) {
      // 익명 댓글: 비밀번호 확인
      setDeleteId(comment.id)
      setDeleteError(null)
    } else if (confirm(t('free.commentDeleteConfirm'))) {
      // 계정 댓글(본인/관리자): 바로 삭제
      doDeleteComment(comment.id)
    }
  }

  const canDelete = (comment: FreePostComment) =>
    !comment.author_id || comment.author_id === currentUserId || isAdmin

  const fieldClass =
    'px-4 py-3 bg-bg-card/60 border border-accent-dim/20 rounded-lg text-sm text-text-primary font-serif placeholder: focus:outline-none focus:border-accent/40'

  return (
    <div className="relative">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <MessageTabletIcon size={18} color="#8a732a" strokeWidth={1.5} />
        <span className="font-serif text-sm text-text-primary">
          {t('comment.header')} <span className="text-accent">{comments.length}</span>
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-accent-dim/20 to-transparent" />
      </div>

      {/* 댓글 목록 */}
      <div className="space-y-4 mb-6">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="group relative p-4 rounded-lg bg-bg-card/40 border border-accent-dim/10 hover:border-accent-dim/20"
          >
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FreeAvatar item={comment} anonymousLabel={t('free.anonymous')} size={28} />
                  <span className="text-sm font-serif font-medium text-text-primary">
                    {freeDisplayName(comment, t('free.anonymous'))}
                  </span>
                  <span className="text-xs">
                    {format(new Date(comment.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                  </span>
                </div>
                <p className="text-sm text-text-secondary whitespace-pre-wrap font-serif leading-relaxed">
                  <FormattedText text={comment.content} />
                </p>
              </div>
              {canDelete(comment) && (
                <button
                  onClick={() => handleDeleteClick(comment)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 self-start"
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
            <p className="text-sm font-serif">{t('free.commentEmpty')}</p>
          </div>
        )}
      </div>

      {/* 댓글 작성 폼 (누구나) */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {!isLoggedIn && (
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('free.nicknamePlaceholder')}
              maxLength={20}
              className={`sm:w-48 ${fieldClass}`}
            />
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder={t('free.passwordPlaceholder')}
              maxLength={4}
              className={`sm:w-32 text-center tracking-[0.3em] placeholder:tracking-normal ${fieldClass}`}
            />
          </div>
        )}
        {isLoggedIn && (
          <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary select-none">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            {t('free.anonymousToggle')}
          </label>
        )}
        {/* 익명 선택 시 필명 입력 — 비우면 "익명"으로 표시 */}
        {isLoggedIn && anonymous && (
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t('free.nicknamePlaceholder')}
            maxLength={20}
            className={`sm:w-48 ${fieldClass}`}
          />
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('free.commentPlaceholder')}
            maxLength={1000}
            className={`flex-1 ${fieldClass}`}
          />
          <Button type="submit" size="sm" disabled={isSubmitting} className="font-serif px-5">
            {isSubmitting ? '...' : t('comment.submit')}
          </Button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      {/* 익명 댓글 삭제 비밀번호 모달 */}
      <PasswordPromptModal
        isOpen={deleteId !== null}
        onClose={() => {
          setDeleteId(null)
          setDeleteError(null)
        }}
        onConfirm={(pw) => {
          if (deleteId) doDeleteComment(deleteId, pw)
        }}
        isLoading={deleting}
        error={deleteError}
        description={t('free.commentDeleteConfirm')}
      />
    </div>
  )
}
