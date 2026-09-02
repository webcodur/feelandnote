import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/db/server'
import { getFeedbacks } from '@/actions/board/feedbacks'
import FeedbackList from '@/components/features/board/feedbacks/FeedbackList'
import { resolveLocale } from '@/types/locale'

export async function generateMetadata() {
  const t = await getTranslations('agora.feedback')
  return { title: t('title'), description: t('description') }
}

const ITEMS_PER_PAGE = 10

import type { FeedbackCategory } from '@/types/database'

const VALID_CATEGORIES: FeedbackCategory[] = ['CELEB_REQUEST', 'CONTENT_REPORT', 'FEATURE_SUGGESTION']

interface FeedbackPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; category?: string }>
}

export default async function FeedbackPage({ params, searchParams }: FeedbackPageProps) {
  const [{ locale: rawLocale }, { page, category: rawCategory }] = await Promise.all([params, searchParams])
  const locale = resolveLocale(rawLocale)
  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const offset = (currentPage - 1) * ITEMS_PER_PAGE
  const category = VALID_CATEGORIES.includes(rawCategory as FeedbackCategory)
    ? (rawCategory as FeedbackCategory)
    : undefined

  const db = await createClient()
  const [{ data: { user } }, { feedbacks, total }] = await Promise.all([
    db.auth.getUser(),
    getFeedbacks({ locale, limit: ITEMS_PER_PAGE, offset, category }),
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
