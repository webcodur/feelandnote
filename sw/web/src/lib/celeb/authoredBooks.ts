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
