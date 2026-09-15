/*
  파일명: /components/shared/AffiliateBookList.tsx
  기능: 책 상품 목록 — 표지·제목·저자, YES24·쿠팡 단추, 책 상세 보기
  책임: 인물 상세 「참고도서」, 세력도감 인물 모달, 서재 베스트셀러 차트가 같은 상품 카드를 쓴다.
        번역본 없음·절판은 표지 한가운데 띠로 알린다. 우리 작품이 아닌 외부 차트 항목은 purchaseHref로 서점 제휴 주소를 열고,
        작품 상세가 없는 목록은 onDetail을 넘겨 「책 상세 보기」 대신 모양이 다른 「책 정보」 단추로 부르는 쪽의 모달을 연다.
*/
import AffiliateBookAction from "@/components/features/user/contentLibrary/AffiliateBookAction";
import Link from 'next/link'
import ContentImage from '@/components/ui/ContentImage'
import NoEditionBadge from '@/components/ui/NoEditionBadge'
import { getBookPurchaseHref } from '@/lib/books/bookPurchaseHref'
import { BookOpenText, ExternalLink, Info } from 'lucide-react'
import CenteredSectionHeading from '@/components/ui/CenteredSectionHeading'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { cn } from '@/lib/utils'

interface AffiliateBookListProps {
  books: AffiliateBook[]
  heading: string
  buyLabel: string
  detailLabel: string
  compact?: boolean
  platform?: 'coupang' | 'amazon'
  hideHeading?: boolean
  /** 순위가 있는 목록에서 화면 낭독용 순위 문구(예: 「3위」) */
  rankLabel?: (rank: number) => string
  /** 우리 작품 상세가 없는 목록(서재 차트) — 작품 상세로 가는 대신 「책 정보」 단추가 이 함수를 불러 모달을 띄운다. detailLabel도 그 문구를 넘긴다 */
  onDetail?: (book: AffiliateBook) => void
}

const DETAIL_CLASS = "mt-auto flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] font-medium text-white/70 hover:border-[#d4af37]/40 hover:bg-[#d4af37]/10 hover:text-[#d4af37] active:bg-[#d4af37]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"

/** 작품 상세로 가지 않고 모달을 여는 「책 정보」 — 점선 금색 테두리와 정보 아이콘으로 「책 상세 보기」와 구별한다 */
const INFO_CLASS = "mt-auto flex items-center justify-center gap-1.5 rounded-md border border-dashed border-accent/45 bg-transparent px-2 py-1.5 text-xs font-medium text-accent/85 hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 md:text-[13px]"

export default function AffiliateBookList({ books, heading, buyLabel, detailLabel, compact = false, hideHeading = false, platform = 'coupang', rankLabel, onDetail }: AffiliateBookListProps) {
  if (books.length === 0) return null

  return (
    <section className={cn(
      "w-full border-t border-white/5",
      hideHeading ? "mt-0 pb-0 pt-4 md:pt-6" : compact ? "mt-3 pb-0 pt-2 md:mt-4" : "mt-12 pb-2 pt-6 md:mt-20 md:pt-10",
    )}>
      {!hideHeading && (
        <CenteredSectionHeading
          title={heading}
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
        {books.map((book) => {
          const detailContent = (
            <>
              <BookOpenText size={13} className="shrink-0" aria-hidden />
              {detailLabel}
            </>
          )
          const detailClass = cn(DETAIL_CLASS, compact ? "px-1.5 py-1.5 text-[10px]" : "px-2 py-1.5 text-xs md:text-[13px]")

          return (
          <div
            key={book.contentId}
            className={cn(
              // relative — 안의 화면 낭독용 순위 문구(sr-only, 절대 위치)가 가로 스크롤 상자 밖을 기준으로 잡혀 페이지 폭을 넓히지 않게 카드가 기준 상자가 된다
              "relative min-w-0 shrink-0 snap-start flex flex-col gap-1",
              compact ? "w-[190px] md:w-[200px]" : "md:w-[180px]",
              !compact && (platform === 'coupang' ? "w-[144px]" : "w-[128px]"),
            )}
          >
            {book.rank !== undefined && !compact && (
              <span className="mb-1 block text-2xl leading-none tabular-nums text-accent">
                {rankLabel && <span className="sr-only">{rankLabel(book.rank)}</span>}
                <span aria-hidden={rankLabel ? true : undefined}>{book.rank}</span>
              </span>
            )}
            <div className="group/purchase relative flex min-w-0 shrink-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-bg-card hover:border-accent/70 hover:bg-accent/10">
              <a
                href={book.purchaseHref ?? (platform === 'coupang' ? getBookPurchaseHref(book.contentId, book.editionId, 'yes24') : book.url)}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className={cn(
                  "flex min-w-0 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
                  compact ? "flex-row" : "flex-col",
                  compact && (platform === 'coupang' ? "h-22" : "h-16"),
                )}
                title={`${book.title} · ${platform === 'coupang' ? 'YES24' : buyLabel}`}
              >
                <div className={cn(
                  "relative shrink-0 overflow-hidden bg-white/[0.04]",
                  compact ? "w-10" : "w-full aspect-[2/3]",
                  compact && (platform === 'coupang' ? "h-22" : "h-16"),
                )}>
                  <ContentImage
                    src={book.thumbnail}
                    alt={book.title}
                    sizes={compact ? "40px" : platform === 'coupang' ? "(max-width: 767px) 144px, 180px" : "(max-width: 767px) 128px, 180px"}
                    className="object-cover"
                  />
                  {/* 번역본 없음·절판은 표지 한가운데 띠로 — 서비스 공통 작품 카드와 같은 표시. 작은 표지에는 두지 않는다 */}
                  {!compact && <NoEditionBadge variant="cover" badge={book.titleBadge} />}
                  <ExternalLink
                    size={30}
                    strokeWidth={1.7}
                    className={cn(
                      "absolute rounded-full bg-black text-accent group-hover/purchase:text-accent-hover",
                      compact ? "end-1 top-1 h-4 w-4 p-0.5" : "end-2 top-2 p-1.5",
                    )}
                    aria-hidden
                  />
                </div>
                <div className={cn(
                  "flex min-w-0 flex-col",
                  compact
                    ? "min-w-0 flex-1 items-start px-2 text-start"
                    : "w-full shrink-0 items-center px-2.5 pb-3 text-center",
                  compact && (platform === 'coupang' ? "justify-end" : "justify-center"),
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
                  {platform !== 'coupang' && <span className={cn(
                    "flex items-center gap-1 font-medium text-accent group-hover/purchase:text-accent",
                    !compact && "justify-center",
                    compact ? "text-[10px]" : "text-[11px] md:text-xs",
                  )}>
                    {buyLabel}
                    <ExternalLink size={11} aria-hidden />
                  </span>}
                </div>
              </a>
            </div>

            {platform === 'coupang' && (
              <AffiliateBookAction contentId={book.contentId} editionId={book.editionId} coupangUrl={book.url} yes24Href={book.purchaseHref} compact showNotice />
            )}

            {!compact && (onDetail ? (
              <button type="button" aria-haspopup="dialog" onClick={() => onDetail(book)} className={INFO_CLASS} title={`${book.title} · ${detailLabel}`}>
                <Info size={13} className="shrink-0" aria-hidden />
                {detailLabel}
              </button>
            ) : (
              <Link href={`/content/${book.contentId}?category=book`} className={detailClass} title={`${book.title} · ${detailLabel}`}>
                {detailContent}
              </Link>
            ))}
          </div>
          )
        })}
      </div>

    </section>
  )
}
