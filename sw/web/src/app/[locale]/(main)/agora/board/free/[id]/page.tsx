import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import { getFreePost, getFreeComments } from '@/actions/board/free'
import FreePostDetail from '@/components/features/board/free/FreePostDetail'

interface FreeDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: FreeDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const post = await getFreePost(id)
  if (!post) return {}
  const t = await getTranslations('agora')
  return { title: `${post.title} | ${t('freeBoard')}` }
}

export default async function FreeDetailPage({ params }: FreeDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [post, comments, admin, { data: { user } }] = await Promise.all([
    getFreePost(id),
    getFreeComments(id),
    isAdmin(supabase),
    supabase.auth.getUser(),
  ])

  if (!post) {
    notFound()
  }

  // 조회수 증가는 클라이언트(FreePostDetail)가 24시간 중복 방지 판정 후 수행한다
  return (
    <FreePostDetail
      post={post}
      initialComments={comments}
      currentUserId={user?.id}
      isAdmin={admin}
      isLoggedIn={!!user}
    />
  )
}
