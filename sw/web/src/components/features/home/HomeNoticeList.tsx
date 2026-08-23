/*
  파일명: /components/features/home/HomeNoticeList.tsx
  기능: 홈 공지 티저 — 목록을 세우고 누르면 그 자리에서 본문을 편다
  책임: 홈에서 공지를 읽는 데 페이지 이동을 요구하지 않는다. 본문은 목록 조회가 이미 실어 온
        것이라 모달을 열 때 다시 조회하지 않는다. 조회수만 서버에 올리고 화면 숫자는 낙관적으로
        더한다 — 실제 숫자는 목록 캐시(1시간)가 다시 만들어질 때 맞춰진다.
*/

'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Eye, MessageSquare } from 'lucide-react'
import type { NoticeWithAuthor } from '@/types/database'
import { incrementNoticeView } from '@/actions/board/notices'
import { LaurelIcon } from '@/components/ui/icons/neo-pantheon/LaurelIcon'
import Modal from '@/components/ui/Modal'
import { Link } from '@/i18n/navigation'
import {
  formatBoardDateTime,
  formatBoardRelativeTime,
  formatBoardShortDateTime,
} from '@/lib/board/boardDate'
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
      <div className="mx-auto max-w-3xl space-y-3 px-4">
        {notices.map((notice) => (
          <button
            key={notice.id}
            type="button"
            onClick={() => open(notice)}
            /* 테두리·배경·제목색은 즉각 축이다(ui-hover). 모서리 장식만 연출 축으로 둔다 */
            className={`group relative block w-full text-left p-4 rounded-lg bg-bg-card/60 backdrop-blur-sm border border-accent-dim/20 hover:border-accent/40 hover:bg-bg-card/80 ${
              notice.is_pinned ? 'border-l-2 border-l-accent' : ''
            }`}
          >
            <span aria-hidden className="absolute top-0 left-0 w-3 h-3 border-t border-l border-accent/0 group-hover:border-accent/30 transition-colors rounded-tl" />
            <span aria-hidden className="absolute top-0 right-0 w-3 h-3 border-t border-r border-accent/0 group-hover:border-accent/30 transition-colors rounded-tr" />
            <span aria-hidden className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-accent/0 group-hover:border-accent/30 transition-colors rounded-bl" />
            <span aria-hidden className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-accent/0 group-hover:border-accent/30 transition-colors rounded-br" />

            <span className="flex items-start gap-3">
              {notice.is_pinned && (
                <span className="flex-shrink-0 mt-0.5">
                  <LaurelIcon size={18} color="#d4af37" strokeWidth={1.5} />
                </span>
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-serif font-medium text-text-primary truncate group-hover:text-accent">
                  {notice.title}
                  {isNew(notice.created_at) && (
                    <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-sans font-bold leading-none rounded bg-accent/20 text-accent align-middle">
                      N
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-3 mt-2 text-xs">
                  <span className="font-serif">{notice.author.nickname}</span>
                  <span className="text-accent-dim/50">·</span>
                  <span>{formatBoardRelativeTime(notice.created_at, locale)}</span>
                  <span className="text-accent-dim/30">
                    ({formatBoardShortDateTime(notice.created_at, locale)})
                  </span>
                  <span className="text-accent-dim/50">·</span>
                  <span className="flex items-center gap-1">
                    <Eye size={12} className="text-accent-dim" />
                    {viewCountOf(notice)}
                  </span>
                  {(notice.comment_count ?? 0) > 0 && (
                    <>
                      <span className="text-accent-dim/50">·</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} className="text-accent-dim" />
                        {notice.comment_count}
                      </span>
                    </>
                  )}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <Modal
        isOpen={!!current}
        onClose={() => setOpenId(null)}
        title={current?.title}
        size="full"
      >
        {current && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-sm pb-4 border-b border-accent-dim/20">
              <span className="font-serif text-text-secondary">{current.author.nickname}</span>
              <span className="text-accent-dim/50">·</span>
              <span>{formatBoardDateTime(current.created_at, locale)}</span>
              <span className="text-accent-dim/50">·</span>
              <span className="flex items-center gap-1">
                <Eye size={14} className="text-accent-dim" />
                {viewCountOf(current)}
              </span>
            </div>

            <div className="whitespace-pre-wrap text-text-secondary leading-relaxed font-serif max-h-[60vh] overflow-y-auto">
              {current.content}
            </div>

            {/* 댓글 등 나머지는 상세 화면이 쥔다 */}
            <div className="flex justify-end border-t border-accent-dim/20 pt-4">
              <Link
                href={`/agora/board/notice/${current.id}`}
                className="text-xs text-accent/80 hover:text-accent"
              >
                {t('notice.viewDetail')} →
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
