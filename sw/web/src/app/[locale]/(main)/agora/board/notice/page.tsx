import { getTranslations } from 'next-intl/server'
import { getNotices } from '@/actions/board/notices'
import { createClient } from '@/lib/db/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import NoticeList from '@/components/features/board/notices/NoticeList'
import { resolveLocale } from '@/types/locale'
import Lane from '@/components/ui/pending/Lane'
import { PendingBlock, RetryBlock } from '@/components/ui/pending'

export async function generateMetadata() {
  const t = await getTranslations('agora.notice')
  return { title: t('title'), description: t('description') }
}

const ITEMS_PER_PAGE = 10

interface NoticePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

export default function NoticePage(props: NoticePageProps) {
  return <Lane fallback={<PendingBlock variant="rows" count={6} />}><NoticeBody {...props} /></Lane>
}

async function NoticeBody({ params, searchParams }: NoticePageProps) {
  const [{ locale: rawLocale }, { page }] = await Promise.all([params, searchParams])
  const locale = resolveLocale(rawLocale)
  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const result = await createClient().then(async db => {
    // 예약 공지는 관리자 확인이 끝난 뒤에만 조회한다.
    const admin = await isAdmin(db)
    const data = await getNotices({ locale, limit: ITEMS_PER_PAGE, offset, includeScheduled: admin })
    return { ...data, admin }
  }).catch(error => {
    console.error('[NoticeBoard:list]', error)
    return null
  })
  if (!result) return <RetryBlock />
  const { notices, total, admin } = result

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
