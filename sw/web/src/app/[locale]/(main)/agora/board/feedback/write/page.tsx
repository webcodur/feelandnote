import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FeedbackForm from '@/components/features/board/feedbacks/FeedbackForm'

export const metadata = {
  title: '피드백 작성',
}

export default async function FeedbackWritePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <FeedbackForm mode="create" />
}
