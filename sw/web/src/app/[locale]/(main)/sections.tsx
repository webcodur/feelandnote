import { RetryBlock } from '@/components/ui/pending'
import HomeNoticeSection from '@/components/features/home/HomeNoticeSection'

export async function NoticeSection() {
  let content: Awaited<ReturnType<typeof HomeNoticeSection>>
  try { content = await HomeNoticeSection() }
  catch (error) { console.error('[home] 공지사항 조회 실패', error); return <RetryBlock /> }
  return content
}
