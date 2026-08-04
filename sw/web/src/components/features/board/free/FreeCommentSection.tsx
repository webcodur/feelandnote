'use client'

import { useState, useEffect, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
import { Button, FormattedText } from '@/components/ui'
import type { FreePostComment } from '@/types/database'
import { createFreeComment, deleteFreeComment, updateFreeComment } from '@/actions/board/free'
import { freeDisplayName } from '@/lib/board/freeDisplay'
import { MessageTabletIcon } from '@/components/ui/icons/neo-pantheon/MessageTabletIcon'
import { formatBoardDateTime } from '@/lib/board/boardDate'
import { resolveLocale } from '@/types/locale'
import { loadRememberedNickname, rememberNickname } from './useFreePostDraft'
import PasswordPromptModal from './PasswordPromptModal'
import FreeAvatar from './FreeAvatar'
import { ModerationMenu, UgcTermsNotice } from '@/components/features/moderation'
import { ENUM_REPORT_TARGET_TYPE } from '@/constants/moderation'

interface FreeCommentSectionProps {
  postId: string
  initialComments: FreePostComment[]
  currentUserId?: string
  isAdmin?: boolean
  isLoggedIn: boolean
  onCommentCreated?: (comment: FreePostComment) => void
  onCommentUpdated?: (comment: FreePostComment) => void
  onCommentDeleted?: (commentId: string) => void
}

export default function FreeCommentSection({
  postId,
  initialComments,
  currentUserId,
  isAdmin = false,
  isLoggedIn,
  onCommentCreated,
  onCommentUpdated,
  onCommentDeleted,
}: FreeCommentSectionProps) {
  const t = useTranslations('board')
  const tError = useTranslations('actionErrors')
  const locale = resolveLocale(useLocale())
  const [comments, setComments] = useState(initialComments)
  const [nickname, setNickname] = useState('')
  const [newComment, setNewComment] = useState('')
  const [password, setPassword] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const commentElementsRef = useRef(new Map<string, HTMLDivElement>())
  const pendingRevealIdRef = useRef<string | null>(null)

  // 직전에 쓴 필명을 기본값으로 — 글쓰기와 같은 값을 공유한다.
  // localStorage는 서버에 없으므로 마운트 후에 읽는다(하이드레이션 불일치 방지).
  useEffect(() => {
    const remembered = loadRememberedNickname()
    if (remembered) setNickname(remembered)
  }, [])

  // 새 댓글이 입력창 위에 추가되어도 화면 밖에 숨지 않도록 실제 댓글을 가장 가까운 위치로 드러낸다.
  useEffect(() => {
    const pendingId = pendingRevealIdRef.current
    if (!pendingId) return

    const element = commentElementsRef.current.get(pendingId)
    if (!element) return

    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    pendingRevealIdRef.current = null
  }, [comments])

  // 삭제 모달 (익명 댓글용)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // 수정 상태. 비회원 댓글은 저장할 때 작성 비밀번호를 확인한다.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editPasswordId, setEditPasswordId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

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
          ? { postId, locale, content: newComment, anonymous, nickname: anonymous ? nickname.trim() || undefined : undefined }
          : { postId, locale, content: newComment, nickname: nickname.trim() || undefined, password },
      )

      if (result.success) {
        pendingRevealIdRef.current = result.data.id
        setComments((prev) => [...prev, result.data])
        onCommentCreated?.(result.data)
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
      onCommentDeleted?.(id)
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

  const canMutate = (comment: FreePostComment) =>
    !comment.author_id || comment.author_id === currentUserId || isAdmin

  const startEditing = (comment: FreePostComment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
    setEditError(null)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditContent('')
    setEditPasswordId(null)
    setEditError(null)
  }

  const doUpdateComment = async (id: string, pw?: string) => {
    if (isUpdating) return
    setIsUpdating(true)
    setEditError(null)

    try {
      const result = await updateFreeComment({ id, postId, content: editContent, password: pw })
      if (result.success) {
        setComments((prev) => prev.map((comment) => comment.id === id ? result.data : comment))
        onCommentUpdated?.(result.data)
        cancelEditing()
      } else {
        setEditError(tError(result.error))
      }
    } catch {
      setEditError(tError('UNKNOWN_ERROR'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEditSubmit = (e: React.FormEvent, comment: FreePostComment) => {
    e.preventDefault()
    if (!editContent.trim() || isUpdating) return

    if (!comment.author_id) {
      setEditPasswordId(comment.id)
      setEditError(null)
      return
    }

    doUpdateComment(comment.id)
  }

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
            ref={(element) => {
              if (element) commentElementsRef.current.set(comment.id, element)
              else commentElementsRef.current.delete(comment.id)
            }}
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
                    {formatBoardDateTime(comment.created_at, locale)}
                  </span>
                </div>
                {editingId === comment.id ? (
                  <form onSubmit={(e) => handleEditSubmit(e, comment)} className="space-y-2">
                    <textarea
                      autoFocus
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      maxLength={1000}
                      rows={3}
                      className={`${fieldClass} w-full resize-y leading-relaxed`}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditing}
                        disabled={isUpdating}
                      >
                        {t('cancel')}
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isUpdating || !editContent.trim()}
                      >
                        {isUpdating ? t('saving') : t('update')}
                      </Button>
                    </div>
                    {editError && <p className="text-sm text-red-400">{editError}</p>}
                  </form>
                ) : (
                  <p className="text-sm text-text-secondary whitespace-pre-wrap font-serif leading-relaxed">
                    <FormattedText text={comment.content} />
                  </p>
                )}
              </div>
              {editingId !== comment.id && (
                <div className="flex gap-1 self-start">
                  {canMutate(comment) && (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditing(comment)}
                        aria-label={t('edit')}
                        title={t('edit')}
                        className="rounded p-1.5 text-text-secondary/70 hover:bg-accent/5 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(comment)}
                        aria-label={t('delete')}
                        title={t('delete')}
                        className="rounded p-1.5 text-text-secondary/70 hover:bg-red-500/5 hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}

                  <ModerationMenu
                    targetType={ENUM_REPORT_TARGET_TYPE.COMMENT}
                    targetId={comment.id}
                    authorId={comment.author_id ?? null}
                    authorNickname={freeDisplayName(comment, t('free.anonymous'))}
                    viewerId={currentUserId ?? null}
                    targetLabel={comment.content}
                  />
                </div>
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
        <UgcTermsNotice />
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

      {/* 비회원 댓글 수정 비밀번호 모달 */}
      <PasswordPromptModal
        isOpen={editPasswordId !== null}
        onClose={() => {
          setEditPasswordId(null)
          setEditError(null)
        }}
        onConfirm={(pw) => {
          if (editPasswordId) doUpdateComment(editPasswordId, pw)
        }}
        isLoading={isUpdating}
        error={editError}
        description={t('free.commentEditPasswordPromptDesc')}
      />
    </div>
  )
}
