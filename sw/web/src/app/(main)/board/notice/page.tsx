import { getNotices } from '@/actions/board/notices'
import NoticeList from '@/components/features/board/notices/NoticeList'

export const metadata = {
  title: '공지사항',
}

export default async function NoticePage() {
  const { notices, total } = await getNotices()

  return <NoticeList initialNotices={notices} initialTotal={total} />
}
