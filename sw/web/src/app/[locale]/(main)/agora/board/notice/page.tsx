import { getTranslations } from 'next-intl/server'
import { getNotices } from '@/actions/board/notices'
import { createClient } from '@/lib/db/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import NoticeList from '@/components/features/board/notices/NoticeList'
import { resolveLocale } from '@/types/locale'

export async function generateMetadata() {
  const t = await getTranslations('agora.notice')
  return { title: t('title'), description: t('description') }
}

const ITEMS_PER_PAGE = 10

interface NoticePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function NoticePage({ params, searchParams }: NoticePageProps) {
  const [{ locale: rawLocale }, { page }] = await Promise.all([params, searchParams])
  const locale = resolveLocale(rawLocale)
  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const db = await createClient()
  const [{ notices, total }, admin] = await Promise.all([
    getNotices({ locale, limit: ITEMS_PER_PAGE, offset }),
    isAdmin(db)
  ])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <NoticeList
      notices={notices}
      currentPage={currentPage}
      totalPages={totalPages}
      isAdmin={admin}
    />
  )
}
