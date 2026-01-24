'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageSquarePlus, Plus } from 'lucide-react'
import { Button } from '@/components/ui'
import type { FeedbackWithAuthor } from '@/types/database'
import { getFeedbacks } from '@/actions/board/feedbacks'
import FeedbackItem from './FeedbackItem'

interface FeedbackListProps {
  initialFeedbacks: FeedbackWithAuthor[]
  initialTotal: number
  isLoggedIn: boolean
}

export default function FeedbackList({ initialFeedbacks, initialTotal, isLoggedIn }: FeedbackListProps) {
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const hasMore = feedbacks.length < initialTotal

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const result = await getFeedbacks({ offset: feedbacks.length })
      setFeedbacks((prev) => [...prev, ...result.feedbacks])
    } catch (error) {
      console.error('Load more error:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <div>
      {/* 작성 버튼 */}
      {isLoggedIn && (
        <div className="flex justify-end mb-4">
          <Link href="/board/feedback/write">
            <Button size="sm">
              <Plus size={16} />
              피드백 작성
            </Button>
          </Link>
        </div>
      )}

      {feedbacks.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquarePlus size={48} strokeWidth={1} className="mx-auto mb-4 text-text-tertiary opacity-50" />
          <p className="text-text-secondary mb-2">피드백이 없습니다</p>
          {isLoggedIn && (
            <p className="text-sm text-text-tertiary">첫 번째 피드백을 작성해보세요</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((feedback) => (
            <FeedbackItem key={feedback.id} feedback={feedback} />
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
      )}
    </div>
  )
}
