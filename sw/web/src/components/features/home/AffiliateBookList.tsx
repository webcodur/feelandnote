import Link from 'next/link'
import ContentImage from '@/components/ui/ContentImage'
import { AFFILIATE_PLATFORMS } from '@/constants/affiliatePlatforms'
import { BookOpenText, ExternalLink } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'

interface AffiliateBookListProps {
  books: AffiliateBook[]
  heading: string
  buyLabel: string
  detailLabel: string
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
export default function AffiliateBookList({ books, heading, buyLabel, detailLabel }: AffiliateBookListProps) {
  if (books.length === 0) return null

  return (
    <section className="w-full mt-12 md:mt-20 pt-6 md:pt-10 pb-6 md:pb-10 border-t border-white/5">
      <div className="flex flex-col items-center text-center mb-4 md:mb-7 gap-2">
        <div className="w-8 h-[2px] bg-[#d4af37] rounded-full shadow-[0_0_8px_rgba(212,175,55,0.3)]" />
        <Logo size="md" asLink={false} />
        <h2 className="text-base font-bold tracking-tight text-text-secondary md:text-xl">{heading}</h2>
      </div>

      {/* 좁은 화면: 한 줄로 옆으로 넘김 · 넓은 화면: 가운데 정렬해 줄바꿈 */}
      <div className="flex gap-3 md:gap-5 overflow-x-auto px-4 pb-2 snap-x snap-mandatory md:flex-wrap md:justify-center md:overflow-visible md:px-0 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {books.map((book) => (
          <div
            key={book.contentId}
            className="shrink-0 snap-start flex w-[128px] flex-col gap-2 md:w-[180px] md:gap-3"
          >
            <div className="flex flex-col overflow-hidden rounded-lg border border-[#E44232]/40 bg-[#E44232]/10">
              <a
                href={book.url}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className="group/coupang flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E44232]/70 focus-visible:ring-inset"
                title={`${book.title} · ${buyLabel}`}
              >
                <div className="relative w-full aspect-[2/3] overflow-hidden bg-white/[0.04]">
                  <ContentImage
                    src={book.thumbnail}
                    alt={book.title}
                    sizes="(max-width: 768px) 128px, 180px"
                    className="object-cover"
                  />
                  <ExternalLink
                    size={30}
                    strokeWidth={1.7}
                    className="absolute end-2 top-2 rounded-full bg-black p-1.5 text-[#ff776a] shadow-[0_0_10px_rgba(255,119,106,0.5)] group-hover/coupang:text-[#ff9a8f] group-hover/coupang:shadow-[0_0_12px_rgba(255,154,143,0.65)]"
                    aria-hidden
                  />
                </div>
                <div className="flex flex-col items-center gap-0.5 px-2.5 py-2 text-center">
                  <p className="min-w-0 truncate text-[13px] font-semibold text-white/90 group-hover/coupang:text-[#ff776a] md:text-sm">
                    {book.title}
                  </p>
                  {book.creator && <p className="truncate text-[11px] md:text-xs text-white/50 group-hover/coupang:text-[#ff776a]/85">{book.creator}</p>}
                </div>
              </a>
            </div>

            <Link
              href={`/content/${book.contentId}?category=book`}
              className="mt-auto flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-2 text-xs font-medium text-white/70 hover:border-[#d4af37]/40 hover:bg-[#d4af37]/10 hover:text-[#d4af37] active:bg-[#d4af37]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] md:text-[13px]"
              title={`${book.title} · ${detailLabel}`}
            >
              <BookOpenText size={13} className="shrink-0" aria-hidden />
              {detailLabel}
            </Link>
          </div>
        ))}
      </div>

      <p className="text-[10px] md:text-xs text-center mt-3 px-4">{AFFILIATE_PLATFORMS.coupang.notice}</p>
    </section>
  )
}
