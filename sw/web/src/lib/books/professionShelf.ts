import type { BookShelfBook, BookShelfGroup } from '@/components/shared/BookShelf/types'
import { PROFESSION_BOOK_CATEGORIES, type ProfessionBookCategory } from '@feelandnote/shared/constants/profession-books'

/** 훈련의 읽기 순서와 각 분류의 선정 이유를 DB 조회 순서 그대로 유지한다. */
export function getProfessionShelfChoices(books: BookShelfBook[], labels: {
  train: string; become: string; about: string; trainIntro: string; becomeIntro: string; aboutIntro: string
}): NonNullable<BookShelfGroup['choices']> {
  const intros: Record<ProfessionBookCategory, string> = { train: labels.trainIntro, become: labels.becomeIntro, about: labels.aboutIntro }
  return PROFESSION_BOOK_CATEGORIES.map((key) => ({ key, label: labels[key], intro: intros[key],
    books: books.filter((book) => book.professionCategory === key) }))
}
