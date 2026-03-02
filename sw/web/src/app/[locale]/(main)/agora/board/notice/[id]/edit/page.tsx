import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import { getNotice } from '@/actions/board/notices'
import NoticeForm from '@/components/features/board/notices/NoticeForm'

interface NoticeEditPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata() {
  const t = await getTranslations('agora.notice')
  return { title: t('edit') }
}

export default async function NoticeEditPage({ params }: NoticeEditPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const admin = await isAdmin(supabase)

  if (!admin) {
    redirect('/agora/board/notice')
  }

  const notice = await getNotice(id)

  if (!notice) {
    notFound()
  }

  return <NoticeForm mode="edit" notice={notice} />
}
