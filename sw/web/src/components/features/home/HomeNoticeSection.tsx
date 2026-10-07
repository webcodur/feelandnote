/*
  파일명: /components/features/home/HomeNoticeSection.tsx
  기능: 홈 공지사항 한 줄 — 최근 공지 넘김과 전체보기
  책임: 조회만 하고 줄과 읽기 모달은 HomeNoticeList가 그린다.
        최근 공지를 가져오고, 한 줄 안에서 이전·다음으로 넘긴다.
*/

import { getNotices } from '@/actions/board/notices'
import { getLocale } from 'next-intl/server'
import { resolveLocale } from '@/types/locale'
import HomeNoticeList from './HomeNoticeList'
import { PendingBlock } from '@/components/ui/pending'

// 최근 공지는 한 줄에서 넘겨 보고, 전체 목록은 게시판에서 확인한다.
const NOTICE_LIMIT = 5

/** 로딩 중에도 공지 한 줄의 높이를 유지한다. */
const ROW_H = 'h-11'

/** 이 목록이 채워지기를 기다리는 자리 */
export function HomeNoticePending({ label }: { label?: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <PendingBlock
        variant="grid"
        cols="grid-cols-1"
        aspect={ROW_H}
        count={1}
        label={label}
      />
    </div>
  )
}

export default async function HomeNoticeSection() {
  const locale = resolveLocale(await getLocale())
  const { notices } = await getNotices({ locale, limit: NOTICE_LIMIT, offset: 0, pinnedFirst: false })

  if (notices.length === 0) return null

  return <HomeNoticeList notices={notices} />
}
