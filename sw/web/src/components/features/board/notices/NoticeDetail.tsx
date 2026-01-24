'use client'

import Link from 'next/link'
import { ArrowLeft, Eye, Pin } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { NoticeWithAuthor } from '@/types/database'

interface NoticeDetailProps {
  notice: NoticeWithAuthor
}

export default function NoticeDetail({ notice }: NoticeDetailProps) {
  return (
    <div>
      {/* 뒤로가기 */}
      <Link
        href="/board/notice"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6"
      >
        <ArrowLeft size={16} />
        목록으로
      </Link>

      {/* 헤더 */}
      <div className="border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          {notice.is_pinned && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-accent/20 text-accent">
              <Pin size={12} />
              고정
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-3">
          {notice.title}
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-tertiary">
          <span>{notice.author.nickname}</span>
          <span>·</span>
          <span>{format(new Date(notice.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Eye size={14} />
            {notice.view_count}
          </span>
        </div>
      </div>

      {/* 본문 */}
      <div className="prose prose-invert max-w-none">
        <div className="whitespace-pre-wrap text-text-secondary leading-relaxed">
          {notice.content}
        </div>
      </div>
    </div>
  )
}
