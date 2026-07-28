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
import { getFreePosts, getFreeComments, deleteFreePost, incrementFreePostView } from '@/actions/board/free'
import { freeDisplayName } from '@/lib/board/freeDisplay'
import { shouldCountView } from '@/lib/board/viewDedup'
import FreeAvatar from '@/components/features/board/free/FreeAvatar'
import FreeCommentSection from '@/components/features/board/free/FreeCommentSection'
import FreePostComposer from '@/components/features/board/free/FreePostComposer'
import PasswordPromptModal from '@/components/features/board/free/PasswordPromptModal'
import { useReadPosts } from '@/components/features/board/free/useReadPosts'
import LoadMoreButton from '@/components/ui/LoadMoreButton'

interface HomeFreeBoardListProps {
  posts: FreePost[]
  initialHasMore: boolean
  currentUserId?: string
  isAdmin?: boolean
  isLoggedIn: boolean
}

const isNew = (dateStr: string) => Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000
const ITEMS_PER_PAGE = 20

export default function HomeFreeBoardList({
  posts: initialPosts,
  initialHasMore,
  currentUserId,
  isAdmin = false,
  isLoggedIn,
}: HomeFreeBoardListProps) {
  const t = useTranslations('board')
  const tError = useTranslations('actionErrors')
  const [posts, setPosts] = useState(initialPosts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // 여러 글을 각각 독립적으로 펼친다 — 다른 글이 접히며 위치가 튀는 것을 막는다
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  // 이미 열어본 글은 "새 글" 딱지를 뗀다
  const { readIds, markRead } = useReadPosts(posts.map((p) => p.id))
  const [commentsMap, setCommentsMap] = useState<Record<string, FreePostComment[]>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // 삭제 비밀번호 모달
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const { posts: newPosts, hasMore: newHasMore } = await getFreePosts({
        limit: ITEMS_PER_PAGE,
        offset: posts.length,
      })
      setPosts((prev) => [...prev, ...newPosts])
      setHasMore(newHasMore)
    } catch (error) {
      console.error('Failed to load more posts', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const toggle = async (post: FreePost) => {
    const isOpening = !openIds.has(post.id)
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(post.id)) next.delete(post.id)
      else next.add(post.id)
      return next
    })
    if (isOpening) markRead(post.id)
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
      setDeleteError(tError(result.error))
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
          <p className="text-xs mt-2">{t('free.emptySubtitle')}</p>
        </div>
      ) : (
        <div className="space-y-3 [overflow-anchor:none]">
          {posts.map((post) => {
            const isOpen = openIds.has(post.id)
            return (
              <div
                key={post.id}
                className={`group/card relative rounded-lg bg-bg-card border [overflow-anchor:none] transition-[border-color] duration-200 ${
                  isOpen ? 'border-accent/40' : 'border-white/5'
                }`}
              >
                {/* 즉각 반응하는 왼쪽 강조 바 */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg transition-none ${
                    isOpen ? 'bg-accent/40' : 'bg-transparent group-hover/card:bg-accent/50'
                  }`}
                />

                {/* 헤더 (클릭 → 아코디언) */}
                <button
                  onClick={() => toggle(post)}
                  className={`group w-full text-left p-4 sm:p-5 flex items-start gap-4 hover:bg-white/[0.03] rounded-lg transition-none ${
                    isOpen ? 'bg-white/[0.02]' : ''
                  }`}
                  aria-expanded={isOpen}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-serif font-medium text-text-primary group-hover:text-accent flex items-center gap-2">
                      <span className="truncate">{post.title}</span>
                      {isNew(post.created_at) && !readIds.has(post.id) && (
                        <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-sans font-bold leading-none rounded bg-accent text-bg-main">
                          N
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2 text-xs">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <FreeAvatar item={post} anonymousLabel={t('free.anonymous')} size={18} />
                        <span className="font-serif">{freeDisplayName(post, t('free.anonymous'))}</span>
                      </div>
                      <span className="text-accent-dim/30 hidden sm:inline">·</span>
                      <div className="flex items-center gap-1.5">
                        <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}</span>
                        <span className="">
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
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isOpen
                        ? 'bg-accent/10 text-accent'
                        : 'bg-white/5  group-hover:bg-accent/10 group-hover:text-accent'
                    }`}
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
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
                        <Link href={`/agora/board/free/${post.id}/edit`} title={t('edit')}>
                          <button className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors">
                            <Edit3 size={15} />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(post)}
                          title={t('delete')}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}

                    {/* 댓글 */}
                    <div className="mt-6">
                      {loadingId === post.id ? (
                        <div className="flex justify-center py-6">
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

          <div className="pt-4">
            <LoadMoreButton
              hasMore={hasMore}
              isLoading={isLoadingMore}
              onClick={loadMore}
            />
          </div>
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
