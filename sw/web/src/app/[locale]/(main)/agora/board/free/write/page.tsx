import { getTranslations } from 'next-intl/server'
import { getRequestUser } from '@/lib/db/server'
import FreePostForm from '@/components/features/board/free/FreePostForm'

export async function generateMetadata() {
  const t = await getTranslations('board')
  return { title: t('free.createTitle') }
}

// 익명 게시판 — 로그인하면 계정으로, 아니면 익명으로 작성
export default async function FreeWritePage() {
  const { data: { user } } = await getRequestUser()

  return <FreePostForm mode="create" isLoggedIn={!!user} />
}
