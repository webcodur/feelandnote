import type { FactionFigureBook } from '@/actions/home/getFactionFigureBooks'
import { GRAVES_GREEK_MYTHS_ID } from '@/actions/home/mythTypes'

const normalizeTitle = (value: string) => value.toLowerCase().replace(/[\s\-—–:：·,.'"《》「」『』()（）[\]]/g, '')

/** 오디세우스의 방랑·귀향을 다룬 권을 개인 소속과 신화 책장에서 함께 고른다. */
export function getThemeBookTextScope(contentId: string, themeSlug?: string): string | null {
  return contentId === GRAVES_GREEK_MYTHS_ID && themeSlug === 'homer-odyssey' ? 'volume-2' : null
}

/** 주제책은 서버가 카드에 붙인 isTheme 표식(faction_lv2.theme_book_ids)으로 판정하고,
    신화는 확인된 판본 제목도 함께 판정한다. */
export function isThemeBook(book: { isTheme?: boolean; title: string }, name: string, isMyth: boolean): boolean {
  if (book.isTheme) return true
  const title = normalizeTitle(book.title)
  const theme = normalizeTitle(name)
  return isMyth && !!theme && title.startsWith(theme)
}

/** 선택한 소속 자체의 주제책만 표시한다. 구성원의 다른 작품으로 채우지 않는다. */
export function selectCelebAffiliationBooks(
  books: FactionFigureBook[],
  theme: { name: string; isMyth: boolean },
): FactionFigureBook[] {
  const ownBooks = books.filter((book) => isThemeBook(book, theme.name, theme.isMyth))
  return [...new Map(ownBooks.map((book) => [book.contentId, book])).values()]
}
