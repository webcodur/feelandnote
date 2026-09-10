import Link from 'next/link'
import ContentImage from '@/components/ui/ContentImage'
import { AFFILIATE_PLATFORMS } from '@/constants/affiliatePlatforms'
import { BookOpenText, ExternalLink } from 'lucide-react'
import CenteredSectionHeading from '@/components/ui/CenteredSectionHeading'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { cn } from '@/lib/utils'
import CoupangPurchaseInfo from '@/components/shared/CoupangPurchaseInfo'

interface AffiliateBookListProps {
  books: AffiliateBook[]
  heading: string
  buyLabel: string
  detailLabel: string
  compact?: boolean
  platform?: 'coupang' | 'amazon'
  /** 바깥 구획 머리가 제목을 맡을 때 레일 제목·윗여백을 뺀다 */
  hideHeading?: boolean
}

/**
 * 제휴 링크가 걸린 책을 표지와 함께 늘어놓는다.
 *
 * 표지·제목 덩어리는 쿠팡으로, 하단 책 상세 보기 버튼은 우리 작품 상세로 보낸다.
 * 최초 카드 구조는 그대로 두고 두 링크의 목적지만 뒤집었다.
 * 두 목적지는 별도 링크라 hover·focus 상태도 서로 번지지 않는다.
 * 좁은 화면에서는 옆으로 넘겨 보게 해 세로로 길어지지 않게 한다.
 * 대가성 안내 문구는 쿠팡 정책상 링크와 같은 화면에 있어야 하므로 여기서 함께 낸다.
 */
export default function AffiliateBookList({ books, heading, buyLabel, detailLabel, compact = false, hideHeading = false, platform = 'coupang' }: AffiliateBookListProps) {
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
        {books.map((book) => (
          <div
            key={book.contentId}
            className={cn(
              "shrink-0 snap-start flex flex-col gap-1",
              compact ? "w-[190px] md:w-[200px]" : "md:w-[180px]",
              !compact && (platform === 'coupang' ? "w-[144px]" : "w-[128px]"),
            )}
          >
            <div className="group/coupang relative flex flex-col overflow-hidden rounded-lg border border-[#E44232]/40 bg-[#E44232]/10 hover:border-red-300/80 hover:bg-red-400/25">
              <a
                href={book.url}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className={cn(
                  "flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E44232]/70 focus-visible:ring-inset",
                  compact ? "flex-row" : "flex-col",
                  compact && (platform === 'coupang' ? "h-22" : "h-16"),
                )}
                title={`${book.title} · ${buyLabel}`}
              >
                <div className={cn(
                  "relative overflow-hidden bg-white/[0.04]",
                  compact ? "w-10 shrink-0" : "w-full aspect-[2/3]",
                  compact && (platform === 'coupang' ? "h-22" : "h-16"),
                )}>
                  <ContentImage
                    src={book.thumbnail}
                    alt={book.title}
                    sizes={compact ? "40px" : "(max-width: 768px) 128px, 180px"}
                    className="object-cover"
                  />
                  <ExternalLink
                    size={30}
                    strokeWidth={1.7}
                    className={cn(
                      "absolute rounded-full bg-black text-[#ff776a] shadow-[0_0_10px_rgba(255,119,106,0.5)] group-hover/coupang:text-[#ff9a8f] group-hover/coupang:shadow-[0_0_12px_rgba(255,154,143,0.65)]",
                      compact ? "end-1 top-1 h-4 w-4 p-0.5" : "end-2 top-2 p-1.5",
                    )}
                    aria-hidden
                  />
                </div>
                <div className={cn(
                  "flex flex-col",
                  compact
                    ? "min-w-0 flex-1 items-start px-2 text-start"
                    : "items-center px-2.5 text-center",
                  compact && (platform === 'coupang' ? "justify-end" : "justify-center"),
                )}>
                  <div className="flex w-full flex-col gap-1 pt-2">
                  <p className={cn(
                    "min-w-0 w-full font-semibold text-text-primary group-hover/coupang:text-red-200",
                    compact ? "truncate text-sm sm:text-sm leading-5" : "line-clamp-2 text-[15px] sm:text-[15px] leading-5",
                  )}>
                    {book.title}
                  </p>
                  {book.creator && <p className={cn(
                    "w-full truncate text-[13px] sm:text-[13px] leading-4 text-text-secondary group-hover/coupang:text-red-200",
                  )}>{book.creator}</p>}
                  </div>
                  <span className={cn(
                    "flex items-center gap-1 font-medium text-red-300 group-hover/coupang:text-red-200",
                    platform === 'coupang' && "h-8 w-full shrink-0 justify-center whitespace-nowrap text-[13px] sm:text-[13px] leading-none",
                    !compact && "justify-center",
                    platform !== 'coupang' && (compact ? "text-[10px]" : "text-[11px] md:text-xs"),
                  )}>
                    {buyLabel}
                    {platform !== 'coupang' && <ExternalLink size={11} aria-hidden />}
                  </span>
                </div>
              </a>
              {platform === 'coupang' && <CoupangPurchaseInfo compact className="absolute bottom-0 end-1 h-8 text-red-300" />}
            </div>

            {!compact && <Link
              href={`/content/${book.contentId}?category=book`}
              className={cn(
                "mt-auto flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] font-medium text-white/70 hover:border-[#d4af37]/40 hover:bg-[#d4af37]/10 hover:text-[#d4af37] active:bg-[#d4af37]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]",
                compact ? "px-1.5 py-1.5 text-[10px]" : "px-2 py-1.5 text-xs md:text-[13px]",
              )}
              title={`${book.title} · ${detailLabel}`}
            >
              <BookOpenText size={13} className="shrink-0" aria-hidden />
              {detailLabel}
            </Link>}
          </div>
        ))}
      </div>

      {AFFILIATE_PLATFORMS[platform].notice && <p className={cn(
        "text-center px-4",
        compact ? "mt-1 text-[10px]" : "mt-2 text-[10px] md:text-xs",
      )}>{AFFILIATE_PLATFORMS[platform].notice}</p>}
    </section>
  )
}
