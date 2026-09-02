import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { createClient } from '@/lib/db/server'
import { getFeedback } from '@/actions/board/feedbacks'
import FeedbackForm from '@/components/features/board/feedbacks/FeedbackForm'
import { resolveLocale } from '@/types/locale'

interface FeedbackEditPageProps {
  params: Promise<{ id: string; locale: string }>
}

export async function generateMetadata() {
  const t = await getTranslations('agora.feedback')
  return { title: t('edit') }
}

export default async function FeedbackEditPage({ params }: FeedbackEditPageProps) {
  const { id, locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()

  if (!user) {
    return redirect({ href: '/login', locale })
  }

  const feedback = await getFeedback(id, locale, false)

  if (!feedback) {
    notFound()
  }

  // 본인 글이 아니거나 PENDING 상태가 아니면 접근 불가
  if (feedback.author_id !== user.id || feedback.status !== 'PENDING') {
    redirect({ href: `/agora/board/feedback/${id}`, locale })
  }

  return <FeedbackForm mode="edit" initialData={feedback} />
}
