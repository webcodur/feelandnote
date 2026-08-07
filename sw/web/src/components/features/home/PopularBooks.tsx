import { getTranslations, getLocale } from 'next-intl/server'
import { getAffiliateBooks } from '@/actions/home/getAffiliateBooks'
import AffiliateBookList from './AffiliateBookList'

/**
 * 제휴 링크가 걸린 도서 구획.
 * 쿠팡은 국내 전용이라 한국어 화면에서만 그린다. 링크가 하나도 없으면 구획 자체를 접는다.
 */
export default async function PopularBooks() {
  const locale = await getLocale()
  if (locale !== 'ko') return null

  const books = await getAffiliateBooks('coupang', 6)
  if (books.length === 0) return null

  const t = await getTranslations('popularBooks')

  return <AffiliateBookList books={books} heading={t('title')} buyLabel={t('buyOnCoupang')} />
}
