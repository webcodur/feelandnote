import { notFound } from 'next/navigation'
import { getNotice } from '@/actions/board/notices'
import NoticeDetail from '@/components/features/board/notices/NoticeDetail'

interface NoticeDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function NoticeDetailPage({ params }: NoticeDetailPageProps) {
  const { id } = await params
  const notice = await getNotice(id)

  if (!notice) {
    notFound()
  }

  return <NoticeDetail notice={notice} />
}
