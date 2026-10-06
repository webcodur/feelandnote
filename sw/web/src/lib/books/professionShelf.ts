import type { BookShelfBook, BookShelfGroup } from '@/components/shared/BookShelf/types'

/** 같은 책이 두 목적에 들어가도 각각의 선정 이유를 유지한다. */
export function getProfessionShelfChoices(books: BookShelfBook[], labels: {
  become: string; about: string; becomeIntro: string; aboutIntro: string
}): NonNullable<BookShelfGroup['choices']> {
  return [
    { key: 'become', label: labels.become, intro: labels.becomeIntro, books: books.filter((book) => book.professionCategory === 'become') },
    { key: 'about', label: labels.about, intro: labels.aboutIntro, books: books.filter((book) => book.professionCategory === 'about') },
  ]
}
