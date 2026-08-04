import { getTranslations } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import FeedbackForm from '@/components/features/board/feedbacks/FeedbackForm'
import { resolveLocale } from '@/types/locale'

interface FeedbackWritePageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata() {
  const t = await getTranslations('agora.feedback')
  return { title: t('write') }
}

export default async function FeedbackWritePage({ params }: FeedbackWritePageProps) {
  const { locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect({ href: '/login', locale })
  }

  return <FeedbackForm mode="create" />
}
