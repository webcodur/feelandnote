import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFeedback } from '@/actions/board/feedbacks'
import FeedbackDetail from '@/components/features/board/feedbacks/FeedbackDetail'

interface FeedbackDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function FeedbackDetailPage({ params }: FeedbackDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const feedback = await getFeedback(id)

  if (!feedback) {
    notFound()
  }

  const isAuthor = user?.id === feedback.author_id

  return <FeedbackDetail feedback={feedback} isAuthor={isAuthor} />
}
