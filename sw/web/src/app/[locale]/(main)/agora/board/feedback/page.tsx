import { getTranslations } from 'next-intl/server'
import { getRequestUser } from '@/lib/db/server'
import { getFeedbacks } from '@/actions/board/feedbacks'
import FeedbackList from '@/components/features/board/feedbacks/FeedbackList'
import { resolveLocale } from '@/types/locale'
import Lane from '@/components/ui/pending/Lane'
import { PendingBlock, RetryBlock } from '@/components/ui/pending'

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

export default function FeedbackPage(props: FeedbackPageProps) {
  return <Lane fallback={<PendingBlock variant="rows" count={6} />}><FeedbackBody {...props} /></Lane>
}

async function FeedbackBody({ params, searchParams }: FeedbackPageProps) {
  const [{ locale: rawLocale }, { page, category: rawCategory }] = await Promise.all([params, searchParams])
  const locale = resolveLocale(rawLocale)
  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const offset = (currentPage - 1) * ITEMS_PER_PAGE
  const category = VALID_CATEGORIES.includes(rawCategory as FeedbackCategory)
    ? (rawCategory as FeedbackCategory)
    : undefined

  const result = await Promise.all([
    getRequestUser(),
    getFeedbacks({ locale, limit: ITEMS_PER_PAGE, offset, category }),
  ]).catch(error => {
    console.error('[FeedbackBoard:list]', error)
    return null
  })
  if (!result) return <RetryBlock />
  const [{ data: { user } }, { feedbacks, total }] = result

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
