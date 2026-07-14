import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getFreePost } from '@/actions/board/free'
import FreePostForm from '@/components/features/board/free/FreePostForm'

interface FreeEditPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata() {
  const t = await getTranslations('board')
  return { title: t('free.editTitle') }
}

// 익명 게시판 — 저장 시 검증(계정 글=본인/관리자, 익명 글=비밀번호)
export default async function FreeEditPage({ params }: FreeEditPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: { user } }, post] = await Promise.all([
    supabase.auth.getUser(),
    getFreePost(id),
  ])

  if (!post) {
    notFound()
  }

  // 익명 글이면 수정에도 비밀번호가 필요하다
  const needsPassword = !post.author_id

  return <FreePostForm mode="edit" initialData={post} isLoggedIn={!!user} needsPassword={needsPassword} />
}
