import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getNotice } from '@/actions/board/notices'
import { getComments } from '@/actions/board/comments'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import NoticeDetail from '@/components/features/board/notices/NoticeDetail'

interface NoticeDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: NoticeDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const notice = await getNotice(id)
  if (!notice) return {}
  const t = await getTranslations('agora.notice')
  return { title: `${notice.title} | ${t('title')}` }
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
