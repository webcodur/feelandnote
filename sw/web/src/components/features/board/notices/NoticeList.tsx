'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui'
import type { NoticeWithAuthor } from '@/types/database'
import { getNotices } from '@/actions/board/notices'
import NoticeItem from './NoticeItem'

interface NoticeListProps {
  initialNotices: NoticeWithAuthor[]
  initialTotal: number
}

export default function NoticeList({ initialNotices, initialTotal }: NoticeListProps) {
  const [notices, setNotices] = useState(initialNotices)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const hasMore = notices.length < initialTotal

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const result = await getNotices({ offset: notices.length })
      setNotices((prev) => [...prev, ...result.notices])
    } catch (error) {
      console.error('Load more error:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  if (notices.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText size={48} strokeWidth={1} className="mx-auto mb-4 text-text-tertiary opacity-50" />
        <p className="text-text-secondary">공지사항이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {notices.map((notice) => (
        <NoticeItem key={notice.id} notice={notice} />
      ))}

      {hasMore && (
        <Button
          variant="ghost"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="w-full"
        >
          {isLoadingMore ? '불러오는 중...' : '더보기'}
        </Button>
      )}
    </div>
  )
}
