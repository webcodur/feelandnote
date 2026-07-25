'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Eye, MessageSquare, ChevronDown, Edit3, Trash2, Plus, FileText, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { formatKST } from '@/lib/utils/date'
import { Button } from '@/components/ui'
import type { FreePost, FreePostComment } from '@/types/database'
import { getFreeComments, deleteFreePost, incrementFreePostView } from '@/actions/board/free'
import { freeDisplayName } from '@/lib/board/freeDisplay'
import { shouldCountView } from '@/lib/board/viewDedup'
import FreeAvatar from '@/components/features/board/free/FreeAvatar'
import FreeCommentSection from '@/components/features/board/free/FreeCommentSection'
import FreePostComposer from '@/components/features/board/free/FreePostComposer'
import PasswordPromptModal from '@/components/features/board/free/PasswordPromptModal'

interface HomeFreeBoardListProps {
  posts: FreePost[]
  currentUserId?: string
  isAdmin?: boolean
  isLoggedIn: boolean
}

const isNew = (dateStr: string) => Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000

export default function HomeFreeBoardList({
  posts: initialPosts,
  currentUserId,
  isAdmin = false,
  isLoggedIn,
}: HomeFreeBoardListProps) {
  const t = useTranslations('board')
  const [posts, setPosts] = useState(initialPosts)
  // 여러 글을 각각 독립적으로 펼친다 — 다른 글이 접히며 위치가 튀는 것을 막는다
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const [commentsMap, setCommentsMap] = useState<Record<string, FreePostComment[]>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // 삭제 비밀번호 모달
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const toggle = async (post: FreePost) => {
    const isOpening = !openIds.has(post.id)
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(post.id)) next.delete(post.id)
      else next.add(post.id)
      return next
    })
    // 펼칠 때만 조회수를 올린다 (24시간 중복 방지, best-effort)
    if (isOpening && shouldCountView(post.id)) {
      void incrementFreePostView(post.id)
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, view_count: p.view_count + 1 } : p))
      )
    }
    // 펼칠 때만 댓글을 불러온다
    if (isOpening && !commentsMap[post.id]) {
      setLoadingId(post.id)
      const cs = await getFreeComments(post.id)
      setCommentsMap((prev) => ({ ...prev, [post.id]: cs }))
      setLoadingId(null)
    }
  }

  const canManage = (post: FreePost) => !post.author_id || post.author_id === currentUserId || isAdmin

  const doDelete = async (post: FreePost, password?: string) => {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteFreePost({ id: post.id, password })
    if (result.success) {
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
      setDeleteId(null)
      setOpenIds((prev) => {
        const next = new Set(prev)
        next.delete(post.id)
        return next
      })
    } else {
      setDeleteError(result.message)
    }
    setDeleting(false)
  }

  const handleDeleteClick = (post: FreePost) => {
    if (!post.author_id) {
      setDeleteId(post.id)
      setDeleteError(null)
    } else if (confirm(t('free.deleteConfirm'))) {
      doDelete(post)
    }
  }

  const deleteTarget = posts.find((p) => p.id === deleteId) ?? null

  return (
    <div className="space-y-3">
      {/* 글쓰기 — 홈은 둘러보는 자리라 등록 후에도 페이지를 옮기지 않는다.
          목록을 자체 상태로 들고 있으므로 새 글을 직접 얹어야 바로 보인다(최신순이라 맨 앞) */}
      <FreePostComposer
        isLoggedIn={isLoggedIn}
        stayOnPage
        onCreated={(post) => setPosts((prev) => [post, ...prev])}
      />

      {posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-block p-6 rounded-full bg-bg-card/50 border border-accent-dim/20 mb-6">
            <FileText size={40} strokeWidth={1} className="text-accent-dim" />
          </div>
          <p className="font-serif text-text-secondary">{t('free.emptyTitle')}</p>
          <p className="text-xs text-text-tertiary mt-2">{t('free.emptySubtitle')}</p>
        </div>
      ) : (
        <div className="space-y-3 [overflow-anchor:none]">
          {posts.map((post) => {
            const isOpen = openIds.has(post.id)
            return (
              <div
                key={post.id}
                className={`rounded-lg bg-bg-card/60 border transition-colors duration-200 [overflow-anchor:none] ${
                  isOpen ? 'border-accent/40' : 'border-accent-dim/20'
                }`}
              >
                {/* 헤더 (클릭 → 아코디언) */}
                <button
                  onClick={() => toggle(post)}
                  className="group w-full text-left p-4 flex items-start gap-3 hover:bg-white/[0.03] rounded-lg"
                  aria-expanded={isOpen}
                >
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
                      <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}</span>
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
                  <ChevronDown
                    size={18}
                    className={`text-text-tertiary shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* 펼침 내용 */}
                {isOpen && (
                  <div className="px-4 pb-5 border-t border-accent-dim/15">
                    {/* 본문 */}
                    <div className="pt-4 whitespace-pre-wrap text-sm text-text-secondary leading-relaxed font-serif">
                      {post.content}
                    </div>

                    {/* 수정·삭제 */}
                    {canManage(post) && (
                      <div className="flex items-center justify-end gap-2 mt-4">
                        <Link href={`/agora/board/free/${post.id}/edit`}>
                          <Button size="sm" className="font-serif">
                            <Edit3 size={14} />
                            {t('edit')}
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() => handleDeleteClick(post)}
                          className="text-red-400 hover:text-red-400 hover:border-red-400/50 hover:bg-red-400/10 font-serif"
                        >
                          <Trash2 size={14} />
                          {t('delete')}
                        </Button>
                      </div>
                    )}

                    {/* 댓글 */}
                    <div className="mt-6">
                      {loadingId === post.id ? (
                        <div className="flex justify-center py-6 text-text-tertiary">
                          <Loader2 size={20} className="animate-spin" />
                        </div>
                      ) : (
                        <FreeCommentSection
                          postId={post.id}
                          initialComments={commentsMap[post.id] ?? []}
                          currentUserId={currentUserId}
                          isAdmin={isAdmin}
                          isLoggedIn={isLoggedIn}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 익명 글 삭제 비밀번호 모달 */}
      <PasswordPromptModal
        isOpen={deleteId !== null}
        onClose={() => {
          setDeleteId(null)
          setDeleteError(null)
        }}
        onConfirm={(pw) => {
          if (deleteTarget) doDelete(deleteTarget, pw)
        }}
        isLoading={deleting}
        error={deleteError}
        description={t('free.deleteConfirm')}
      />
    </div>
  )
}
