import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import FeedbackForm from '@/components/features/board/feedbacks/FeedbackForm'

export async function generateMetadata() {
  const t = await getTranslations('agora.feedback')
  return { title: t('write') }
}

export default async function FeedbackWritePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <FeedbackForm mode="create" />
}
