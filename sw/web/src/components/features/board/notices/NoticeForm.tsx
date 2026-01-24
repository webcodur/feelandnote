'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import type { NoticeWithAuthor } from '@/types/database'
import { createNotice, updateNotice } from '@/actions/board/notices'
import { LaurelIcon } from '@/components/ui/icons/neo-pantheon/LaurelIcon'

interface NoticeFormProps {
  mode: 'create' | 'edit'
  notice?: NoticeWithAuthor
}

export default function NoticeForm({ mode, notice }: NoticeFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(notice?.title ?? '')
  const [content, setContent] = useState(notice?.content ?? '')
  const [isPinned, setIsPinned] = useState(notice?.is_pinned ?? false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)

    const result = mode === 'create'
      ? await createNotice({ title, content, is_pinned: isPinned })
      : await updateNotice({ id: notice!.id, title, content, is_pinned: isPinned })

    if (result.success) {
      router.push(mode === 'create' ? '/board/notice' : `/board/notice/${notice!.id}`)
    } else {
      alert(result.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative">
      <Link
        href={mode === 'create' ? '/board/notice' : `/board/notice/${notice?.id}`}
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent font-serif mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        {mode === 'create' ? '목록으로' : '돌아가기'}
      </Link>

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 h-px bg-gradient-to-r from-accent-dim/50 to-transparent" />
        <h1 className="text-xl font-serif font-bold text-text-primary">
          {mode === 'create' ? '공지사항 작성' : '공지사항 수정'}
        </h1>
        <div className="flex-1 h-px bg-gradient-to-l from-accent-dim/50 to-transparent" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-serif font-medium text-text-primary mb-2">
            제목
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            maxLength={100}
            className="w-full px-4 py-3 bg-bg-card/60 border border-accent-dim/20 rounded-lg text-text-primary font-serif placeholder:text-text-tertiary focus:outline-none focus:border-accent/40 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-serif font-medium text-text-primary mb-2">
            내용
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={12}
            className="w-full px-4 py-3 bg-bg-card/60 border border-accent-dim/20 rounded-lg text-text-primary font-serif placeholder:text-text-tertiary focus:outline-none focus:border-accent/40 resize-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-bg-card/40 border border-accent-dim/10">
          <input
            type="checkbox"
            id="isPinned"
            checked={isPinned}
            onChange={e => setIsPinned(e.target.checked)}
            className="w-4 h-4 rounded border-accent-dim/30 bg-bg-card text-accent focus:ring-accent"
          />
          <LaurelIcon size={16} color={isPinned ? '#d4af37' : '#8a732a'} strokeWidth={1.5} />
          <label htmlFor="isPinned" className="text-sm text-text-secondary font-serif">
            상단에 고정
          </label>
        </div>

        {/* 하단 장식 */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-accent-dim/20" />
          <div className="text-accent-dim/30 text-xs">✦</div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-accent-dim/20" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href={mode === 'create' ? '/board/notice' : `/board/notice/${notice?.id}`}>
            <Button type="button" variant="ghost" className="font-serif">
              취소
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="font-serif">
            {isSubmitting ? '저장 중...' : mode === 'create' ? '작성' : '수정'}
          </Button>
        </div>
      </form>
    </div>
  )
}
