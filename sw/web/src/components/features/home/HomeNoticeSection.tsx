/*
  파일명: /components/features/home/HomeNoticeSection.tsx
  기능: 홈 공지사항 — 제목 목록과 선택한 공지 본문
  책임: 공개된 최근 공지를 조회하고 HomeNoticeList에 전달한다.
*/

import { getNotices } from '@/actions/board/notices'
import { getLocale, getTranslations } from 'next-intl/server'
import { resolveLocale } from '@/types/locale'
import HomeNoticeList from './HomeNoticeList'
import { PendingBlock } from '@/components/ui/pending'

const NOTICE_LIMIT = 3

/** 이 목록이 채워지기를 기다리는 자리 */
export function HomeNoticePending({ label }: { label?: string }) {
  return (
    <div className="mx-auto" style={{ maxWidth: 'var(--home-content-width,720px)' }}>
      <PendingBlock
        variant="panel"
        minHeight="min-h-[216px]"
        label={label}
      />
    </div>
  )
}

export default async function HomeNoticeSection() {
  const locale = resolveLocale(await getLocale())
  const { notices } = await getNotices({ locale, limit: NOTICE_LIMIT, offset: 0, pinnedFirst: false })

  if (notices.length === 0) {
    const t = await getTranslations('board.notice')
    return <p className="text-center text-sm text-text-secondary">{t('emptyTitle')}</p>
  }

  return <HomeNoticeList notices={notices} />
}
