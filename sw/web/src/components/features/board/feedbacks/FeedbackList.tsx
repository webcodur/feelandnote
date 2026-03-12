'use client'

import { Link, useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, MessageSquare } from 'lucide-react'
import { Button, Pagination } from '@/components/ui'
import type { FeedbackWithAuthor, FeedbackCategory } from '@/types/database'
import FeedbackItem from './FeedbackItem'

const CATEGORIES: (FeedbackCategory | 'ALL')[] = [
  'ALL', 'CELEB_REQUEST', 'CONTENT_REPORT', 'FEATURE_SUGGESTION'
]

interface FeedbackListProps {
  feedbacks: FeedbackWithAuthor[]
  total: number
  currentPage: number
  totalPages: number
  isLoggedIn: boolean
  activeCategory?: FeedbackCategory
}

export default function FeedbackList({
  feedbacks,
  total,
  currentPage,
  totalPages,
  isLoggedIn,
  activeCategory
}: FeedbackListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('board')

  const handleCategoryChange = (cat: FeedbackCategory | 'ALL') => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')
    if (cat === 'ALL') {
      params.delete('category')
    } else {
      params.set('category', cat)
    }
    const query = params.toString()
    router.push(`/agora/board/feedback${query ? `?${query}` : ''}`)
  }

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

  const currentCat = activeCategory || 'ALL'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        {/* 카테고리 필터 */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`
                px-3 py-1.5 text-xs font-serif rounded-full border transition-colors
                ${currentCat === cat
                  ? 'bg-accent/20 text-accent border-accent/40'
                  : 'bg-bg-card/60 text-text-tertiary border-accent-dim/20 hover:border-accent/30 hover:text-text-secondary'
                }
              `}
            >
              {cat === 'ALL' ? t('feedback.allCategory') : t(`category.${cat}`)}
            </button>
          ))}
        </div>

        <Link href={isLoggedIn ? '/agora/board/feedback/write' : '/login'}>
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            <span className="font-serif">{t('feedback.write')}</span>
          </Button>
        </Link>
      </div>

      {feedbacks.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-block p-6 rounded-full bg-bg-card/50 border border-accent-dim/20 mb-6">
            <MessageSquare size={48} strokeWidth={1} className="text-accent-dim" />
          </div>
          <p className="font-serif text-text-secondary">{t('feedback.emptyTitle')}</p>
          <p className="text-xs text-text-tertiary mt-2">{t('feedback.emptySubtitle')}</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-white/10 md:divide-y-0 md:space-y-3">
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
