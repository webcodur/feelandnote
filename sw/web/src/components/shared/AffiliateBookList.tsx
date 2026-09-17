/*
  파일명: /components/shared/AffiliateBookList.tsx
  기능: 책 상품 목록 — 표지·제목·저자, YES24·쿠팡·아마존 단추
  책임: 인물 상세 「참고도서」, 세력도감 인물 모달, 서재 베스트셀러 차트가 같은 상품 카드를 쓴다.
        카드 본체는 언제나 「보기」다 — 우리 작품은 작품 상세로, 상세가 없는 외부 차트 항목은 onDetail이 띄우는 책 정보 모달로.
        사러 가는 길은 카드 아래 판매처 단추 하나다. 우리 작품이 아닌 외부 차트 항목은 그 단추가 purchaseHref로 서점 제휴 주소를 연다.
        번역본 없음·절판은 표지 한가운데 띠로 알린다.
        groups를 넘기면 책의 종류가 갈리는 자리마다 세로 구분선이 서고, 누르면 좌우 구간의 뜻을 설명한다.
*/
"use client";

import { Fragment, useState } from 'react'
import AffiliateBookAction from "@/components/features/user/contentLibrary/AffiliateBookAction";
import BookPurchaseInfo from '@/components/shared/BookPurchaseInfo'
import Link from 'next/link'
import ContentImage from '@/components/ui/ContentImage'
import NoEditionBadge from '@/components/ui/NoEditionBadge'
import Modal, { ModalBody } from '@/components/ui/Modal'
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
import CenteredSectionHeading from '@/components/ui/CenteredSectionHeading'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import type { BookStorePlatform } from '@/constants/affiliatePlatforms'
import { cn } from '@/lib/utils'

interface AffiliateBookListProps {
  books: AffiliateBook[]
  heading: string
  buyLabel: string
  detailLabel: string
  compact?: boolean
  /** 판매 기준 서점 — yes24는 YES24 단추에 쿠팡 보조 단추가 붙고, amazon은 아마존 주소(상품 또는 검색)로 잇는다 */
  platform?: BookStorePlatform
  hideHeading?: boolean
  /** 순위가 있는 목록에서 화면 낭독용 순위 문구(예: 「3위」) */
  rankLabel?: (rank: number) => string
  /** 우리 작품 상세가 없는 목록(서재 차트) — 카드 본체가 상세 대신 이 함수를 불러 책 정보 모달을 띄운다. detailLabel도 그 문구를 넘긴다 */
  onDetail?: (book: AffiliateBook) => void
  /** books와 같은 순서의 구간 정보 — 구간이 둘 이상일 때 경계에 세로 구분선을 세운다. count 합계는 books 길이와 같아야 한다 */
  groups?: { label: string; desc?: string; count: number }[]
  /** 구분선 접근성 문구·설명 모달 제목 (예: 「구분선의 뜻」) */
  dividerTitle?: string
}

interface GroupBoundary {
  beforeIndex: number
  left: { label: string; desc?: string }
  right: { label: string; desc?: string }
}

export default function AffiliateBookList({ books, heading, buyLabel, detailLabel, compact = false, hideHeading = false, platform = 'yes24', rankLabel, onDetail, groups, dividerTitle }: AffiliateBookListProps) {
  const [openBoundary, setOpenBoundary] = useState<GroupBoundary | null>(null)

  // 구간 경계를 카드 위치로 환산한다 — 신화 선반의 세로 구분선을 일반 상품 선반으로 가져온 것이다.
  const boundaries: GroupBoundary[] = []
  if (groups && groups.length > 1) {
    let index = 0
    for (let i = 0; i < groups.length - 1; i += 1) {
      index += groups[i].count
      if (index < books.length) boundaries.push({ beforeIndex: index, left: groups[i], right: groups[i + 1] })
    }
  }
  const boundaryAt = new Map(boundaries.map((b) => [b.beforeIndex, b]))

  if (books.length === 0) return null

  return (
    <section className={cn(
      "w-full border-t border-white/5",
      hideHeading ? "mt-0 pb-0 pt-4 md:pt-6" : compact ? "mt-3 pb-0 pt-2 md:mt-4" : "mt-12 pb-2 pt-6 md:mt-20 md:pt-10",
    )}>
      {!hideHeading && (
        <CenteredSectionHeading
          title={heading}
          /* 수수료 안내는 단추 안에 묻지 않고 구획 제목 옆에 둔다. 제목을 숨기는 자리(hideHeading)는 부르는 쪽이 책임진다 */
          titleAddon={platform === 'yes24' ? (
            <BookPurchaseInfo className="ms-1.5 inline-flex size-6 items-center justify-center self-center rounded-full border border-white/10 align-middle" />
          ) : undefined}
          className={compact
            ? "mb-1 items-start px-4 text-start [&>span]:hidden [&_h2]:text-sm [&_h2]:leading-5"
            : "mb-4 md:mb-7"}
        />
      )}

      {/* 좁은 화면: 한 줄로 옆으로 넘김 · 넓은 화면: 가운데 정렬해 줄바꿈 */}
      <div className={cn(
        "flex overflow-x-auto px-4 pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        compact
          ? "gap-3 md:px-4"
          : "gap-3 md:flex-wrap md:justify-center md:gap-5 md:overflow-visible md:px-0 md:pb-0",
      )}>
        {books.map((book, index) => {
          const boundary = boundaryAt.get(index)
          const viewTitle = `${book.title} · ${detailLabel}`
          const viewClass = cn(
            "flex min-w-0 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
            compact ? "flex-row" : "flex-col",
            compact && (platform === 'yes24' ? "h-22" : "h-16"),
          )
          const viewBody = (
            <>
              <div className={cn(
                "relative shrink-0 overflow-hidden bg-white/[0.04]",
                compact ? "w-10" : "w-full aspect-[2/3]",
                compact && (platform === 'yes24' ? "h-22" : "h-16"),
              )}>
                <ContentImage
                  src={book.thumbnail}
                  alt={book.title}
                  sizes={compact ? "40px" : platform === 'yes24' ? "(max-width: 767px) 144px, 180px" : "(max-width: 767px) 128px, 180px"}
                  className="object-cover"
                />
                {/* 번역본 없음·절판은 표지 한가운데 띠로 — 서비스 공통 작품 카드와 같은 표시. 작은 표지에는 두지 않는다 */}
                {!compact && <NoEditionBadge variant="cover" badge={book.titleBadge} />}
              </div>
              <div className={cn(
                "flex min-w-0 flex-col",
                compact
                  ? "min-w-0 flex-1 items-start px-2 text-start"
                  : "w-full shrink-0 items-center px-2.5 pb-3 text-center",
                compact && (platform === 'yes24' ? "justify-end" : "justify-center"),
              )}>
                <div className="flex min-w-0 w-full flex-col gap-1 pt-2">
                <div className={cn("flex min-w-0 w-full shrink-0 items-center", compact ? "h-5" : "h-10")}>
                  <p className={cn(
                    "min-w-0 w-full font-semibold text-text-primary group-hover/purchase:text-accent",
                    compact ? "truncate text-sm leading-5" : "line-clamp-2 break-words text-[15px] leading-5 [&:lang(ko)]:break-keep [&:lang(ko)]:text-balance",
                  )} title={book.title}>
                    {book.title}
                  </p>
                </div>
                <p className="h-4 min-w-0 w-full shrink-0 truncate text-[13px] leading-4 text-text-secondary group-hover/purchase:text-accent" title={book.creator ?? undefined}>{book.creator}</p>
                </div>
              </div>
            </>
          )

          return (
          <Fragment key={book.contentId}>
          {boundary && (
            <button
              type="button"
              onClick={() => setOpenBoundary(boundary)}
              aria-haspopup="dialog"
              aria-label={dividerTitle}
              title={dividerTitle}
              className="group/divider flex w-8 shrink-0 cursor-pointer snap-start flex-col items-center self-stretch py-4 outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              <span className="w-px flex-1 bg-gradient-to-b from-transparent via-accent/30 to-accent/60" />
              <span className="my-3 flex flex-col items-center gap-2">
                <span className="size-1 rotate-45 rounded-[1px] bg-accent/60" />
                <span className="size-2.5 rotate-45 rounded-[2px] border border-accent bg-accent/20 shadow-[0_0_10px_rgba(240,201,72,0.35)] transition-transform duration-200 group-hover/divider:scale-125 group-hover/divider:bg-accent/50" />
                <span className="size-1 rotate-45 rounded-[1px] bg-accent/60" />
              </span>
              <span className="w-px flex-1 bg-gradient-to-b from-accent/60 via-accent/30 to-transparent" />
            </button>
          )}
          <div
            className={cn(
              // relative — 안의 화면 낭독용 순위 문구(sr-only, 절대 위치)가 가로 스크롤 상자 밖을 기준으로 잡혀 페이지 폭을 넓히지 않게 카드가 기준 상자가 된다
              "relative min-w-0 shrink-0 snap-start flex flex-col gap-1",
              compact ? "w-[190px] md:w-[200px]" : "md:w-[180px]",
              !compact && (platform === 'yes24' ? "w-[144px]" : "w-[128px]"),
            )}
          >
            {book.rank !== undefined && !compact && (
              <span className="mb-1 block text-2xl leading-none tabular-nums text-accent">
                {rankLabel && <span className="sr-only">{rankLabel(book.rank)}</span>}
                <span aria-hidden={rankLabel ? true : undefined}>{book.rank}</span>
              </span>
            )}
            {/* 카드 본체는 언제나 「보기」 — 우리 작품은 상세로, 상세 없는 외부 차트 항목은 책 정보 모달로 */}
            <div className="group/purchase relative flex min-w-0 shrink-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-bg-card hover:border-accent/70 hover:bg-accent/10">
              {onDetail ? (
                <button type="button" aria-haspopup="dialog" onClick={() => onDetail(book)} className={viewClass} title={viewTitle}>
                  {viewBody}
                </button>
              ) : (
                <Link href={`/content/${book.contentId}?category=book`} className={viewClass} title={viewTitle}>
                  {viewBody}
                </Link>
              )}
            </div>

            {/* 사러 가는 길은 판매처 단추 하나 — 한국어는 YES24(쿠팡 보조), 영어는 아마존 */}
            {platform === 'yes24' ? (
              <AffiliateBookAction contentId={book.contentId} editionId={book.editionId} coupangUrl={book.url} yes24Href={book.purchaseHref} salesIsbn={book.isbn} compact />
            ) : book.url ? (
              <a
                href={book.url}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className="flex min-h-11 items-center justify-center gap-1 rounded-lg border border-[#FF9900]/40 bg-[#FF9900]/10 px-2 py-2 text-sm font-semibold text-[#FFBF66] hover:border-[#FF9900] hover:bg-[#FF9900]/25 active:bg-[#FF9900]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF9900]"
              >
                {buyLabel}
                <ExternalLink size={11} aria-hidden />
              </a>
            ) : null}
          </div>
          </Fragment>
          )
        })}
      </div>

      {/* 구분선을 누르면 좌우 구간이 무엇인지 설명한다 — 신화 선반과 같은 형식 */}
      <Modal isOpen={openBoundary !== null} onClose={() => setOpenBoundary(null)} title={dividerTitle ?? ''} size="sm">
        {openBoundary && (
          <ModalBody className="flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-accent/50 bg-accent/10 text-accent"><ArrowLeft size={16} /></span>
              <div>
                <p className="text-sm font-bold text-text-primary">{openBoundary.left.label}</p>
                {openBoundary.left.desc && <p className="mt-1 text-sm leading-relaxed text-text-secondary">{openBoundary.left.desc}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-accent/50 bg-accent/10 text-accent"><ArrowRight size={16} /></span>
              <div>
                <p className="text-sm font-bold text-text-primary">{openBoundary.right.label}</p>
                {openBoundary.right.desc && <p className="mt-1 text-sm leading-relaxed text-text-secondary">{openBoundary.right.desc}</p>}
              </div>
            </div>
          </ModalBody>
        )}
      </Modal>

    </section>
  )
}
