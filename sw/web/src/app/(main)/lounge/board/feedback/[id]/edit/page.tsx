import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFeedback } from '@/actions/board/feedbacks'
import FeedbackForm from '@/components/features/board/feedbacks/FeedbackForm'

interface FeedbackEditPageProps {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: '피드백 수정',
}

export default async function FeedbackEditPage({ params }: FeedbackEditPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const feedback = await getFeedback(id)

  if (!feedback) {
    notFound()
  }

  // 본인 글이 아니거나 PENDING 상태가 아니면 접근 불가
  if (feedback.author_id !== user.id || feedback.status !== 'PENDING') {
    redirect(`/lounge/board/feedback/${id}`)
  }

  return <FeedbackForm mode="edit" initialData={feedback} />
}
