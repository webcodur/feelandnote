'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, Edit3, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui'
import type { NoticeWithAuthor, BoardCommentWithAuthor } from '@/types/database'
import { deleteNotice } from '@/actions/board/notices'
import { LaurelIcon } from '@/components/ui/icons/neo-pantheon/LaurelIcon'
import CommentSection from '../shared/CommentSection'

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

  const handleDelete = async () => {
    if (!confirm('공지사항을 삭제하시겠습니까?')) return
    const result = await deleteNotice(notice.id)
    if (result.success) {
      router.push('/board/notice')
    } else {
      alert(result.message)
    }
  }

  return (
    <div className="relative">
      {/* 뒤로가기 */}
      <Link
        href="/board/notice"
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
          {notice.is_pinned && <LaurelIcon size={20} color="#d4af37" strokeWidth={1.5} />}
          <div className="flex-1 h-px bg-gradient-to-l from-accent-dim/50 to-transparent" />
        </div>

        {/* 배지 및 관리자 버튼 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {notice.is_pinned && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-cinzel tracking-wider rounded-full bg-accent/10 text-accent border border-accent/20">
                <LaurelIcon size={12} color="#d4af37" strokeWidth={2} />
                PINNED
              </span>
            )}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Link href={`/board/notice/${notice.id}/edit`}>
                <Button variant="ghost" size="sm" className="font-serif">
                  <Edit3 size={14} />
                  수정
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
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
          {notice.title}
        </h1>

        {/* 메타 정보 */}
        <div className="flex items-center gap-3 text-sm text-text-tertiary pb-4 border-b border-accent-dim/20">
          <span className="font-serif text-text-secondary">{notice.author.nickname}</span>
          <span className="text-accent-dim/50">·</span>
          <span>{format(new Date(notice.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
          <span className="text-accent-dim/50">·</span>
          <span className="flex items-center gap-1">
            <Eye size={14} className="text-accent-dim" />
            {notice.view_count}
          </span>
        </div>
      </div>

      {/* 본문 */}
      <div className="relative py-6">
        {/* 좌측 장식선 */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-accent-dim/30 via-accent-dim/10 to-transparent" />

        <div className="pl-6">
          <div className="whitespace-pre-wrap text-text-secondary leading-relaxed font-serif">
            {notice.content}
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
      <CommentSection
        boardType="NOTICE"
        postId={notice.id}
        initialComments={initialComments}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </div>
  )
}
