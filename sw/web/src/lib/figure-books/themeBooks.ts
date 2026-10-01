import type { FactionFigureBook } from '@/actions/home/getFactionFigureBooks'
import { FACTION_OWN_WORK_IDS, MYTH_OWN_WORK_IDS } from '@/lib/faction-theme'
import { GRAVES_GREEK_MYTHS_ID } from '@/actions/home/mythTypes'

const normalizeTitle = (value: string) => value.toLowerCase().replace(/[\s\-—–:：·,.'"《》「」『』()（）[\]]/g, '')

export function getThemeWorkIds(slug: string): string[] {
  return [...new Set([...(FACTION_OWN_WORK_IDS[slug] ?? []), ...(MYTH_OWN_WORK_IDS[slug] ?? [])])]
}

/** 오디세우스의 방랑·귀향을 다룬 권을 개인 소속과 신화 책장에서 함께 고른다. */
export function getThemeBookTextScope(contentId: string, themeSlug?: string): string | null {
  return contentId === GRAVES_GREEK_MYTHS_ID && themeSlug === 'homer-odyssey' ? 'volume-2' : null
}

/** 주제책은 명시한 작품 ID로, 신화는 확인된 판본 제목도 함께 판정한다. */
export function isThemeBook(book: { contentId: string; title: string }, slug: string, name: string, isMyth: boolean): boolean {
  if (getThemeWorkIds(slug).includes(book.contentId)) return true
  const title = normalizeTitle(book.title)
  const theme = normalizeTitle(name)
  return isMyth && !!theme && title.startsWith(theme)
}

/** 선택한 소속 자체의 주제책만 표시한다. 구성원의 다른 작품으로 채우지 않는다. */
export function selectCelebAffiliationBooks(
  books: FactionFigureBook[],
  theme: { slug: string; name: string; isMyth: boolean },
): FactionFigureBook[] {
  const ownBooks = books.filter((book) => isThemeBook(book, theme.slug, theme.name, theme.isMyth))
  return [...new Map(ownBooks.map((book) => [book.contentId, book])).values()]
}
