import { getEnglishBookAmazonUrl } from '@/lib/books/amazonBookSearch'
import type { TitleBadge } from '@/lib/utils/content-locale'

/** 읽은 책 응답에는 판본 행이 없다. 정확한 EN 제목 행이 확인된 경우에만 검색을 허용한다. */
export function canSearchFactionMemberReadBook(
  titleEn: string | null | undefined,
  titleBadge: TitleBadge | null | undefined,
): boolean {
  return Boolean(titleEn?.trim()) && (titleBadge === null || titleBadge === 'out-of-print')
}

/** 영어 책으로 검색해도 되는 근거가 있을 때만 상품 또는 제목 검색으로 잇는다. */
export function getFactionMemberAmazonUrl({
  title,
  creator,
  url,
  canSearchEnglishBook,
}: {
  title: string
  creator?: string | null
  url?: string | null
  canSearchEnglishBook: boolean
}): string {
  if (!canSearchEnglishBook) return ''
  return getEnglishBookAmazonUrl({ title, creator, url })
}
