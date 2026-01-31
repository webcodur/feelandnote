import { notFound } from 'next/navigation'
import { getNotice } from '@/actions/board/notices'
import { getComments } from '@/actions/board/comments'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import NoticeDetail from '@/components/features/board/notices/NoticeDetail'

interface NoticeDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function NoticeDetailPage({ params }: NoticeDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [notice, comments, admin, { data: { user } }] = await Promise.all([
    getNotice(id),
    getComments({ boardType: 'NOTICE', postId: id }),
    isAdmin(supabase),
    supabase.auth.getUser()
  ])

  if (!notice) {
    notFound()
  }

  return (
    <NoticeDetail
      notice={notice}
      initialComments={comments}
      isAdmin={admin}
      currentUserId={user?.id}
    />
  )
}
