import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import NoticeForm from '@/components/features/board/notices/NoticeForm'

export async function generateMetadata() {
  const t = await getTranslations('agora.notice')
  return { title: t('write') }
}

export default async function NoticeWritePage() {
  const supabase = await createClient()
  const admin = await isAdmin(supabase)

  if (!admin) {
    redirect('/agora/board/notice')
  }

  return <NoticeForm mode="create" />
}
