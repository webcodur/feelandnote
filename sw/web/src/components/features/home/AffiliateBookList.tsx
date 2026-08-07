import Link from 'next/link'
import ContentImage from '@/components/ui/ContentImage'
import { AFFILIATE_PLATFORMS } from '@/constants/affiliatePlatforms'
import { ExternalLink } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'

interface AffiliateBookListProps {
  books: AffiliateBook[]
  heading: string
  buyLabel: string
}

/**
 * 제휴 링크가 걸린 책을 표지와 함께 늘어놓는다.
 *
 * 표지와 제목은 우리 작품 소개로, 아래 버튼만 판매처로 보낸다 — 두 길을 한 카드에 겹쳐 두면
 * 무엇을 눌러도 밖으로 나가 버려 서비스를 더 볼 기회가 사라진다.
 * 좁은 화면에서는 옆으로 넘겨 보게 해 세로로 길어지지 않게 한다.
 * 대가성 안내 문구는 쿠팡 정책상 링크와 같은 화면에 있어야 하므로 여기서 함께 낸다.
 */
export default function AffiliateBookList({ books, heading, buyLabel }: AffiliateBookListProps) {
  if (books.length === 0) return null

  return (
    <section className="w-full mt-12 md:mt-20 pt-6 md:pt-10 pb-6 md:pb-10 border-t border-white/5">
      <div className="flex flex-col items-center text-center mb-4 md:mb-7 gap-2">
        <div className="w-8 h-[2px] bg-[#d4af37] rounded-full shadow-[0_0_8px_rgba(212,175,55,0.3)]" />
        <h2 className="text-base md:text-xl font-bold text-text-primary tracking-tight flex items-center gap-1.5">
          <Logo size="sm" asLink={false} /> {heading}
        </h2>
      </div>

      {/* 좁은 화면: 한 줄로 옆으로 넘김 · 넓은 화면: 가운데 정렬해 줄바꿈 */}
      <div className="flex gap-3 md:gap-5 overflow-x-auto px-4 pb-2 snap-x snap-mandatory md:flex-wrap md:justify-center md:overflow-visible md:px-0 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {books.map((book) => (
          <div
            key={book.contentId}
            className="group shrink-0 snap-start flex flex-col w-[128px] md:w-[180px] rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#d4af37]/30 p-2.5 md:p-4 gap-2 md:gap-3 transition-colors"
          >
            <Link
              href={`/content/${book.contentId}?category=book`}
              className="flex flex-col gap-2"
              title={book.title}
            >
              <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-white/[0.04]">
                <ContentImage src={book.thumbnail} alt={book.title} sizes="(max-width: 768px) 128px, 180px" />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-[13px] md:text-sm font-semibold text-white/90 truncate group-hover:text-[#d4af37] transition-colors">
                  {book.title}
                </p>
                {book.creator && <p className="text-[11px] md:text-xs text-white/50 truncate">{book.creator}</p>}
              </div>
            </Link>

            <a
              href={book.url}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className="flex items-center justify-center gap-1 mt-auto px-2 py-1.5 rounded-md text-[11px] md:text-xs font-medium text-white bg-[#E44232] hover:bg-[#c9382a] transition-colors"
            >
              {buyLabel}
              <ExternalLink size={10} />
            </a>
          </div>
        ))}
      </div>

      <p className="text-[10px] md:text-xs text-center mt-3 px-4">{AFFILIATE_PLATFORMS.coupang.notice}</p>
    </section>
  )
}
