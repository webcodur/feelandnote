'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, MessageSquare } from 'lucide-react'
import { Button, Pagination } from '@/components/ui'
import type { FeedbackWithAuthor } from '@/types/database'
import FeedbackItem from './FeedbackItem'

interface FeedbackListProps {
  feedbacks: FeedbackWithAuthor[]
  total: number
  currentPage: number
  totalPages: number
  isLoggedIn: boolean
}

export default function FeedbackList({
  feedbacks,
  total,
  currentPage,
  totalPages,
  isLoggedIn
}: FeedbackListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete('page')
    } else {
      params.set('page', String(page))
    }
    const query = params.toString()
    router.push(`/board/feedback${query ? `?${query}` : ''}`)
  }

  return (
    <div>
      {isLoggedIn && (
        <div className="flex justify-end mb-6">
          <Link href="/board/feedback/write">
            <Button size="sm" className="gap-2">
              <Plus size={16} />
              <span className="font-serif">피드백 작성</span>
            </Button>
          </Link>
        </div>
      )}

      {feedbacks.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-block p-6 rounded-full bg-bg-card/50 border border-accent-dim/20 mb-6">
            <MessageSquare size={48} strokeWidth={1} className="text-accent-dim" />
          </div>
          <p className="font-serif text-text-secondary">아직 피드백이 없습니다</p>
          {isLoggedIn && (
            <p className="text-xs text-text-tertiary mt-2">첫 번째 피드백을 작성해보세요</p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {feedbacks.map((feedback) => (
              <FeedbackItem key={feedback.id} feedback={feedback} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
