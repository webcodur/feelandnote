import Lane from "@/components/ui/pending/Lane";
import { PendingBlock } from "@/components/ui/pending";
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getNotice } from '@/actions/board/notices'
import { getComments } from '@/actions/board/comments'
import { createClient, getRequestUser } from '@/lib/db/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import NoticeDetail from '@/components/features/board/notices/NoticeDetail'
import { resolveLocale } from '@/types/locale'

interface NoticeDetailPageProps {
  params: Promise<{ id: string; locale: string }>
}

export async function generateMetadata({ params }: NoticeDetailPageProps): Promise<Metadata> {
  const { id, locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  const notice = await getNotice(id, locale, false)
  if (!notice) return {}
  const t = await getTranslations('agora.notice')
  return { title: `${notice.title} | ${t('title')}` }
}

async function NoticeDetailPageBody({ params }: NoticeDetailPageProps) {
  const { id, locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  const db = await createClient()

  const admin = await isAdmin(db)
  const [notice, comments, { data: { user } }] = await Promise.all([
    getNotice(id, locale, true, admin),
    getComments({ boardType: 'NOTICE', postId: id, locale }),
    getRequestUser()
  ])

  if (!notice) {
    notFound()
  }

  return (
    <NoticeDetail
      notice={notice}
      initialComments={comments}
      isAdmin={admin}
      currentUserId={user?.id}
    />
  )
}

export default function NoticeDetailPage(props: Parameters<typeof NoticeDetailPageBody>[0]) {
  return <Lane fallback={<PendingBlock variant="panel" minHeight="min-h-80" />}><NoticeDetailPageBody {...props} /></Lane>;
}
