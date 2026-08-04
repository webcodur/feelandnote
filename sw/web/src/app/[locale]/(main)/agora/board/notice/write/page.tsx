import { getTranslations } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import NoticeForm from '@/components/features/board/notices/NoticeForm'
import { resolveLocale } from '@/types/locale'

interface NoticeWritePageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata() {
  const t = await getTranslations('agora.notice')
  return { title: t('write') }
}

export default async function NoticeWritePage({ params }: NoticeWritePageProps) {
  const { locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  const supabase = await createClient()
  const admin = await isAdmin(supabase)

  if (!admin) {
    redirect({ href: '/agora/board/notice', locale })
  }

  return <NoticeForm mode="create" />
}
