/*
  파일명: /components/features/home/HomeNoticeList.tsx
  기능: 홈 공지 티저 — 목록을 세우고 누르면 그 자리에서 본문을 편다
  책임: 홈에서 공지를 읽는 데 페이지 이동을 요구하지 않는다. 본문은 목록 조회가 이미 실어 온
        것이라 모달을 열 때 다시 조회하지 않는다. 조회수만 서버에 올리고 화면 숫자는 낙관적으로
        더한다 — 실제 숫자는 목록 캐시(1시간)가 다시 만들어질 때 맞춰진다.
        모달의 메타 줄·본문은 공지 상세와 같은 부품(NoticeContent)으로 그린다.
*/

'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import type { NoticeWithAuthor } from '@/types/database'
import { incrementNoticeView } from '@/actions/board/notices'
import Modal, { ModalBody } from '@/components/ui/Modal'
import { Link } from '@/i18n/navigation'
import { NoticeBody, NoticeMeta } from '@/components/features/board/notices/NoticeContent'
import { resolveLocale } from '@/types/locale'

interface Props {
  notices: NoticeWithAuthor[]
}

export default function HomeNoticeList({ notices }: Props) {
  const locale = resolveLocale(useLocale())
  const t = useTranslations('board')
  const homeT = useTranslations('home.hub')
  const [openId, setOpenId] = useState<string | null>(null)
  // 이번 방문에서 올린 조회수 — 캐시된 숫자 위에 얹어 보여 준다
  const [viewBump, setViewBump] = useState<Record<string, number>>({})

  const open = (notice: NoticeWithAuthor) => {
    setOpenId(notice.id)
    if (viewBump[notice.id]) return
    setViewBump((prev) => ({ ...prev, [notice.id]: 1 }))
    void incrementNoticeView(notice.id)
  }

  const current = notices.find((n) => n.id === openId) ?? null
  const viewCountOf = (n: NoticeWithAuthor) => n.view_count + (viewBump[n.id] ?? 0)

  return (
    <>
      <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-control border border-line bg-bg-card px-3">
        <span className="shrink-0 text-xs font-semibold text-accent">{homeT('notice')}</span>
        {notices.slice(0, 1).map((notice) => (
          <button key={notice.id} type="button" onClick={() => open(notice)}
            className="min-h-11 min-w-0 flex-1 truncate rounded-control px-1 text-left text-sm text-text-primary hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {notice.title}
          </button>
        ))}
        <Link href="/agora/board/notice" aria-label={homeT('noticeAll')}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-control px-1 text-xs text-text-secondary hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {homeT('viewAll')}<ArrowRight size={13} aria-hidden />
        </Link>
      </div>

      {/* 읽기용 모달 규격은 ContentTextModal과 같다 — 폭 xl, 바깥을 눌러 닫을 여백, 제목 고정, 한 번만 스크롤 */}
      <Modal
        isOpen={!!current}
        onClose={() => setOpenId(null)}
        title={current?.title}
        titleClassName="px-9 text-center font-semibold text-text-primary break-keep sm:px-10"
        stickyHeader
        size="xl"
        fadeClippedEnd
      >
        {current && (
          <ModalBody className="p-5 sm:p-7">
            <NoticeMeta
              author={current.author?.nickname}
              createdAt={current.created_at}
              viewCount={viewCountOf(current)}
              locale={locale}
              className="pb-4 border-b border-white/10"
            />

            <NoticeBody content={current.content} className="py-5 sm:py-6" />

            {/* 댓글 등 나머지는 상세 화면이 쥔다 */}
            <div className="flex justify-end border-t border-white/10 pt-4">
              <Link
                href={`/agora/board/notice/${current.id}`}
                className="text-sm text-accent hover:text-accent-hover"
              >
                {t('notice.viewDetail')} →
              </Link>
            </div>
          </ModalBody>
        )}
      </Modal>
    </>
  )
}
