'use client'

import { Link, useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('board')

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete('page')
    } else {
      params.set('page', String(page))
    }
    const query = params.toString()
    router.push(`/agora/board/feedback${query ? `?${query}` : ''}`)
  }

  return (
    <div>
      {isLoggedIn && (
        <div className="flex justify-end mb-6">
          <Link href="/agora/board/feedback/write">
            <Button size="sm" className="gap-2">
              <Plus size={16} />
              <span className="font-serif">{t('feedback.write')}</span>
            </Button>
          </Link>
        </div>
      )}

      {feedbacks.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-block p-6 rounded-full bg-bg-card/50 border border-accent-dim/20 mb-6">
            <MessageSquare size={48} strokeWidth={1} className="text-accent-dim" />
          </div>
          <p className="font-serif text-text-secondary">{t('feedback.emptyTitle')}</p>
          {isLoggedIn && (
            <p className="text-xs text-text-tertiary mt-2">{t('feedback.emptySubtitle')}</p>
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
