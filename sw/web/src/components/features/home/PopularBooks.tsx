import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { AFFILIATE_PLATFORMS } from '@/constants/affiliatePlatforms'
import { ExternalLink } from 'lucide-react'
import Logo from '@/components/ui/Logo'

const COUPANG_BOOKS = [
  {
    key: 'odyssey',
    thumbnail: 'https://image.aladin.co.kr/product/36239/0/cover500/k062038716_1.jpg',
    link: 'https://link.coupang.com/a/d0ybK3',
  },
  {
    key: 'iliad',
    thumbnail: 'https://image.aladin.co.kr/product/36238/98/cover500/k932038716_2.jpg',
    link: 'https://link.coupang.com/a/d0ycqt',
  },
]

export default async function PopularBooks() {
  const t = await getTranslations('popularBooks')

  return (
    <section className="w-full mt-16 md:mt-24 pt-8 md:pt-12 pb-8 md:pb-12 border-t border-white/5">
      <div className="flex flex-col items-center text-center mb-6 md:mb-8 gap-2">
        <div className="w-8 h-[2px] bg-[#d4af37] rounded-full shadow-[0_0_8px_rgba(212,175,55,0.3)]" />
        <h2 className="text-lg md:text-xl font-bold text-text-primary tracking-tight flex items-center gap-1.5">
          <Logo size="sm" asLink={false} /> {t('title')}
        </h2>
      </div>

      <div className="flex justify-center gap-4 md:gap-6">
        {COUPANG_BOOKS.map((book) => (
          <a
            key={book.link}
            href={book.link}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group flex flex-col w-[160px] md:w-[240px] rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#d4af37]/30 p-3 md:p-5 gap-2.5 md:gap-3 transition-all hover:bg-white/[0.06]"
          >
            <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-white/[0.04]">
              <Image
                src={book.thumbnail}
                alt={t(`books.${book.key}.title`)}
                fill
                sizes="(max-width: 768px) 160px, 180px"
                className="object-cover"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-white/90 truncate">{t(`books.${book.key}.title`)}</p>
              <p className="text-[11px] text-white/40 leading-tight line-clamp-2">{t(`books.${book.key}.subtitle`)}</p>
              <p className="text-xs text-white/50 mt-0.5">{t(`books.${book.key}.creator`)}</p>
            </div>

            <div className="flex items-center justify-center gap-1 mt-auto px-2 py-1.5 rounded-md text-xs font-medium text-white bg-[#E44232] group-hover:bg-[#c9382a] transition-colors">
              {t('buyOnCoupang')}
              <ExternalLink size={11} />
            </div>
          </a>
        ))}
      </div>

      <p className="text-xs text-text-tertiary text-center mt-4">
        {AFFILIATE_PLATFORMS.coupang.notice}
      </p>
    </section>
  )
}
