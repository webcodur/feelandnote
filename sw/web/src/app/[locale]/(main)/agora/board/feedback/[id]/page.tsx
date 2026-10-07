import Lane from "@/components/ui/pending/Lane";
import { PendingBlock } from "@/components/ui/pending";
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient, getRequestUser } from '@/lib/db/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import { getFeedback } from '@/actions/board/feedbacks'
import { getComments } from '@/actions/board/comments'
import FeedbackDetail from '@/components/features/board/feedbacks/FeedbackDetail'
import { resolveLocale } from '@/types/locale'

interface FeedbackDetailPageProps {
  params: Promise<{ id: string; locale: string }>
}

export async function generateMetadata({ params }: FeedbackDetailPageProps): Promise<Metadata> {
  const { id, locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  const feedback = await getFeedback(id, locale, false)
  if (!feedback) return {}
  const t = await getTranslations('agora.feedback')
  return { title: `${feedback.title} | ${t('title')}` }
}

async function FeedbackDetailPageBody({ params }: FeedbackDetailPageProps) {
  const { id, locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  const db = await createClient()

  const [feedback, comments, admin, { data: { user } }] = await Promise.all([
    getFeedback(id, locale),
    getComments({ boardType: 'FEEDBACK', postId: id, locale }),
    isAdmin(db),
    getRequestUser()
  ])

  if (!feedback) {
    notFound()
  }

  const isAuthor = user?.id === feedback.author_id

  return (
    <FeedbackDetail
      feedback={feedback}
      isAuthor={isAuthor}
      initialComments={comments}
      isAdmin={admin}
      currentUserId={user?.id}
    />
  )
}

export default function FeedbackDetailPage(props: Parameters<typeof FeedbackDetailPageBody>[0]) {
  return <Lane fallback={<PendingBlock variant="panel" minHeight="min-h-80" />}><FeedbackDetailPageBody {...props} /></Lane>;
}
