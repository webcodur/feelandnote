import { getNotices } from '@/actions/board/notices'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import NoticeList from '@/components/features/board/notices/NoticeList'

export const metadata = {
  title: '공지사항',
}

const ITEMS_PER_PAGE = 10

interface NoticePageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function NoticePage({ searchParams }: NoticePageProps) {
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const supabase = await createClient()
  const [{ notices, total }, admin] = await Promise.all([
    getNotices({ limit: ITEMS_PER_PAGE, offset }),
    isAdmin(supabase)
  ])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <NoticeList
      notices={notices}
      total={total}
      currentPage={currentPage}
      totalPages={totalPages}
      isAdmin={admin}
    />
  )
}
