import { getTranslations, getLocale } from 'next-intl/server'
import { getAffiliateBooksForCeleb } from '@/actions/home/getAffiliateBooks'
import AffiliateBookList from '@/components/features/home/AffiliateBookList'

interface CelebAffiliateBooksProps {
  userId: string
}

/**
 * 인물 화면 아래에 붙는 제휴 도서 구획.
 * 그 인물이 읽은 책을 먼저 내고, 없으면 같은 직군 인물들이 읽은 책, 그것도 없으면 많이 읽힌 책 순으로 물러난다.
 * 무엇을 기준으로 골랐는지에 따라 머리글이 달라진다 — 읽지도 않은 책을 "이 인물의 책"처럼 보이면 안 된다.
 */
export default async function CelebAffiliateBooks({ userId }: CelebAffiliateBooksProps) {
  const locale = await getLocale()
  if (locale !== 'ko') return null

  const { books, source } = await getAffiliateBooksForCeleb(userId, 'coupang', 6)
  if (books.length === 0) return null

  const t = await getTranslations('popularBooks')
  const HEADING_KEY: Record<typeof source, string> = {
    origin: 'headingOrigin',
    read: 'headingRead',
    profession: 'headingProfession',
    popular: 'title',
  }
  const heading = t(HEADING_KEY[source])

  return (
    <AffiliateBookList
      books={books}
      heading={heading}
      buyLabel={t('buyOnCoupang')}
      detailLabel={t('viewBookDetails')}
    />
  )
}
