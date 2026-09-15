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
import { ChevronRight, Eye, MessageSquare } from 'lucide-react'
import type { NoticeWithAuthor } from '@/types/database'
import { incrementNoticeView } from '@/actions/board/notices'
import { LaurelIcon } from '@/components/ui/icons/neo-pantheon/LaurelIcon'
import Modal, { ModalBody } from '@/components/ui/Modal'
import { Link } from '@/i18n/navigation'
import { formatBoardRelativeTime } from '@/lib/board/boardDate'
import { Dot, NoticeBody, NoticeMeta } from '@/components/features/board/notices/NoticeContent'
import { resolveLocale } from '@/types/locale'

const isNew = (dateStr: string) =>
  Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000

interface Props {
  notices: NoticeWithAuthor[]
}

export default function HomeNoticeList({ notices }: Props) {
  const locale = resolveLocale(useLocale())
  const t = useTranslations('board')
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
      <div className="mx-auto max-w-3xl space-y-2.5 px-3 sm:px-4">
        {notices.map((notice) => (
          <button
            key={notice.id}
            type="button"
            onClick={() => open(notice)}
            /* 테두리·배경·제목색은 즉각 축이다(ui-hover). 화살표 밀림만 연출 축으로 둔다 */
            className="group flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-left hover:border-accent/50 hover:bg-white/[0.06] sm:px-5 sm:py-3.5"
          >
            {/* 모바일은 메타를 제목 아래로 내려 제목을 자르지 않는다. sm부터 한 줄 */}
            <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
              <div className="flex min-w-0 items-center gap-2 sm:flex-1">
                {notice.is_pinned && (
                  <span className="shrink-0" title={t('notice.pinnedBadge') || 'PINNED'}>
                    <LaurelIcon size={16} color="#d4af37" strokeWidth={1.5} />
                  </span>
                )}
                {isNew(notice.created_at) && (
                  <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 font-sans text-[10px] font-bold leading-none text-bg-main">
                    N
                  </span>
                )}
                <span className="truncate font-serif text-[15px] font-medium text-text-primary group-hover:text-accent sm:text-base">
                  {notice.title}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-2 text-xs text-text-tertiary sm:mt-0 sm:shrink-0">
                {notice.author?.nickname && (
                  <>
                    <span className="hidden font-serif text-text-secondary md:inline">{notice.author.nickname}</span>
                    <Dot className="hidden md:inline" />
                  </>
                )}
                <span className="whitespace-nowrap text-text-secondary">
                  {formatBoardRelativeTime(notice.created_at, locale)}
                </span>
                <Dot />
                <span className="flex items-center gap-1">
                  <Eye size={12} />
                  {viewCountOf(notice)}
                </span>
                {(notice.comment_count ?? 0) > 0 && (
                  <>
                    <Dot />
                    <span className="flex items-center gap-1 text-accent">
                      <MessageSquare size={12} />
                      {notice.comment_count}
                    </span>
                  </>
                )}
              </div>
            </div>

            <ChevronRight
              size={16}
              className="shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
            />
          </button>
        ))}
      </div>

      {/* 읽기용 모달 규격은 ContentTextModal과 같다 — 폭 xl, 바깥을 눌러 닫을 여백, 제목 고정, 한 번만 스크롤 */}
      <Modal
        isOpen={!!current}
        onClose={() => setOpenId(null)}
        title={current?.title}
        titleClassName="px-9 text-center font-semibold text-text-primary break-keep sm:px-10"
        stickyHeader
        size="xl"
        maxHeightClassName="max-h-[78dvh]"
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
