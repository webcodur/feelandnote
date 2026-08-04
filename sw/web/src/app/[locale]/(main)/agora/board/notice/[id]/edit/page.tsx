import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import { getNotice } from '@/actions/board/notices'
import NoticeForm from '@/components/features/board/notices/NoticeForm'
import { resolveLocale } from '@/types/locale'

interface NoticeEditPageProps {
  params: Promise<{ id: string; locale: string }>
}

export async function generateMetadata() {
  const t = await getTranslations('agora.notice')
  return { title: t('edit') }
}

export default async function NoticeEditPage({ params }: NoticeEditPageProps) {
  const { id, locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  const supabase = await createClient()
  const admin = await isAdmin(supabase)

  if (!admin) {
    redirect({ href: '/agora/board/notice', locale })
  }

  const notice = await getNotice(id, 'ko', false)

  if (!notice) {
    notFound()
  }

  return <NoticeForm mode="edit" notice={notice} />
}
