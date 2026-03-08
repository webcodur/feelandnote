import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getFeedbacks } from '@/actions/board/feedbacks'
import FeedbackList from '@/components/features/board/feedbacks/FeedbackList'

export async function generateMetadata() {
  const t = await getTranslations('agora.feedback')
  return { title: t('title'), description: t('description') }
}

const ITEMS_PER_PAGE = 10

import type { FeedbackCategory } from '@/types/database'

const VALID_CATEGORIES: FeedbackCategory[] = ['CELEB_REQUEST', 'CONTENT_REPORT', 'FEATURE_SUGGESTION']

interface FeedbackPageProps {
  searchParams: Promise<{ page?: string; category?: string }>
}

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const { page, category: rawCategory } = await searchParams
  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const offset = (currentPage - 1) * ITEMS_PER_PAGE
  const category = VALID_CATEGORIES.includes(rawCategory as FeedbackCategory)
    ? (rawCategory as FeedbackCategory)
    : undefined

  const supabase = await createClient()
  const [{ data: { user } }, { feedbacks, total }] = await Promise.all([
    supabase.auth.getUser(),
    getFeedbacks({ limit: ITEMS_PER_PAGE, offset, category }),
  ])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <FeedbackList
      feedbacks={feedbacks}
      total={total}
      currentPage={currentPage}
      totalPages={totalPages}
      isLoggedIn={!!user}
      activeCategory={category}
    />
  )
}
