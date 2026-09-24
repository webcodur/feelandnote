import type { FigureBookContent } from '@/actions/figure-books/getFigureBooks'

/**
 * 인물 도서를 관계 유형으로 가른다. 등장(appearance)·창작(authored)·연관(related).
 * 창작은 DB 값이다. 예전에는 책의 저자 표기와 인물 이름을 글자로 비교했는데 푸시킨/푸쉬킨 같은 표기 변형마다 어긋나
 * 관계 유형 authored로 옮겼다(마이그레이션 20260907010000).
 */
export function partitionFigureBooks(books: FigureBookContent[]): {
  appearanceBooks: FigureBookContent[]
  authoredBooks: FigureBookContent[]
  relatedBooks: FigureBookContent[]
} {
  const appearanceBooks: FigureBookContent[] = []
  const authoredBooks: FigureBookContent[] = []
  const relatedBooks: FigureBookContent[] = []
  for (const book of books) {
    if (book.relationType === 'appearance') appearanceBooks.push(book)
    else if (book.relationType === 'authored') authoredBooks.push(book)
    else relatedBooks.push(book)
  }
  return { appearanceBooks, authoredBooks, relatedBooks }
}

/** 절판 표식이 붙은 작품을 뒤로 보낸다. 나머지 작품끼리의 저장 순서는 그대로 둔다. */
export function placeOutOfPrintLast<T extends Pick<FigureBookContent, 'titleBadge'>>(books: readonly T[]): T[] {
  return [
    ...books.filter((book) => book.titleBadge !== 'out-of-print'),
    ...books.filter((book) => book.titleBadge === 'out-of-print'),
  ]
}

/**
 * 「연관 작품」 구획은 기존 판본 도서와 절판 순서를 유지하고, 영문 화면에서는 번역본 없는 도서의 등장 관계도 보여준다.
 * 영어판이 없는 작품은 배지만 표시하며 판본·구매 정보는 만들지 않는다.
 */
export function pickDisplayFigureBooks<T extends Pick<FigureBookContent, 'type' | 'titleBadge' | 'editions'>>(
  books: readonly T[],
  locale: string,
): T[] {
  return placeOutOfPrintLast(books.filter((book) => (
    book.editions.length > 0
    || (locale === 'en' && book.type === 'BOOK' && book.titleBadge === 'no-en')
  )))
}
