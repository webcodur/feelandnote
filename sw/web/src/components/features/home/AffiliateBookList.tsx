import BookPurchaseInfo from "@/components/shared/BookPurchaseInfo";
import AffiliateBookAction from "@/components/features/user/contentLibrary/AffiliateBookAction";
import Link from 'next/link'
import ContentImage from '@/components/ui/ContentImage'
import { getBookPurchaseHref } from '@/lib/books/bookPurchaseHref'
import { BookOpenText, ExternalLink } from 'lucide-react'
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
}

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
              "min-w-0 shrink-0 snap-start flex flex-col gap-1",
              compact ? "w-[190px] md:w-[200px]" : "md:w-[180px]",
              !compact && (platform === 'coupang' ? "w-[144px]" : "w-[128px]"),
            )}
          >
            <div className="group/purchase relative flex min-w-0 shrink-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-bg-card hover:border-accent/70 hover:bg-accent/10">
              <a
                href={platform === 'coupang' ? getBookPurchaseHref(book.contentId, book.editionId, 'yes24') : book.url}
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
              <AffiliateBookAction contentId={book.contentId} editionId={book.editionId} coupangUrl={book.url} compact />
            )}

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

      {platform === 'coupang' && <BookPurchaseInfo className="mx-4 mt-2" />}
    </section>
  )
}
