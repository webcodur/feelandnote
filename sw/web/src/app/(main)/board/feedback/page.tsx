import { createClient } from '@/lib/supabase/server'
import { getFeedbacks } from '@/actions/board/feedbacks'
import FeedbackList from '@/components/features/board/feedbacks/FeedbackList'

export const metadata = {
  title: '피드백',
}

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { feedbacks, total } = await getFeedbacks()

  return (
    <FeedbackList
      initialFeedbacks={feedbacks}
      initialTotal={total}
      isLoggedIn={!!user}
    />
  )
}
