/*
  파일명: /components/features/home/HomeNoticeSection.tsx
  기능: 홈 공지사항 티저 — 최근 공지 다섯 건
  책임: 조회만 하고 줄과 읽기 모달은 HomeNoticeList가 그린다.
        홈은 티저라 페이지 넘김·글쓰기 단추를 두지 않는다 — 전체 보기는 구획 래퍼가 잇는다.
*/

import { getNotices } from '@/actions/board/notices'
import { getLocale } from 'next-intl/server'
import { resolveLocale } from '@/types/locale'
import HomeNoticeList from './HomeNoticeList'
import { PendingBlock } from '@/components/ui/pending'

// 홈은 티저다 — 다섯 줄만 세우고 나머지는 게시판이 쥔다
const ITEMS_PER_PAGE = 5

/** 공지 한 줄의 높이(모바일은 제목·메타 두 줄, sm부터 한 줄). 기다림이 실물과 같은 자리를 잡게 한다 */
const ROW_H = 'h-[68px] sm:h-[54px]'

/** 이 목록이 채워지기를 기다리는 자리 */
export function HomeNoticePending({ label }: { label?: string }) {
  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4">
      <PendingBlock
        variant="grid"
        cols="grid-cols-1"
        aspect={ROW_H}
        count={ITEMS_PER_PAGE}
        label={label}
      />
    </div>
  )
}

export default async function HomeNoticeSection() {
  const locale = resolveLocale(await getLocale())
  const { notices } = await getNotices({ locale, limit: ITEMS_PER_PAGE, offset: 0 })

  if (notices.length === 0) return null

  return <HomeNoticeList notices={notices} />
}
