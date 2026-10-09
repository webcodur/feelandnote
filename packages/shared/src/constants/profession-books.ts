/** 직업 도서의 표시 순서와 DB가 허용하는 분류. */
export const PROFESSION_BOOK_CATEGORIES = ['train', 'become', 'about'] as const
export type ProfessionBookCategory = typeof PROFESSION_BOOK_CATEGORIES[number]
