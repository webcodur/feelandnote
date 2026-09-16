import { getTranslations, getLocale } from 'next-intl/server'
import { getAffiliateBooks } from '@/actions/home/getAffiliateBooks'
import AffiliateBookList from '@/components/shared/AffiliateBookList'
import { getBookStorePlatform } from '@/constants/affiliatePlatforms'

/**
 * 서점으로 이을 수 있는 도서 구획 — 한국어는 YES24(쿠팡은 보조 단추), 영어는 아마존(상품이 없으면 검색).
 * 후보가 하나도 없으면 구획 자체를 접는다.
 */
export default async function PopularBooks() {
  const locale = await getLocale()
  const books = await getAffiliateBooks(locale === 'en' ? 'en' : 'ko', 6)
  if (books.length === 0) return null

  const [t, tPage] = await Promise.all([getTranslations('popularBooks'), getTranslations('celebPage')])
  const platform = getBookStorePlatform(locale)

  return (
    <AffiliateBookList
      books={books}
      heading={t('title')}
      buyLabel={platform === 'amazon' ? tPage('sourceWorkBuyAmazon') : t('buy')}
      detailLabel={t('viewBookDetails')}
      platform={platform}
    />
  )
}
