'use client'

import BookShelfBookChip from './BookShelfBookChip'
import type { BookShelfBook } from './types'
import styles from './BookShelf.module.css'
import listStyles from './BookShelfList.module.css'

export default function BookShelfListItem({ book, selected, onSelect, editionId, metadata, arriving }: {
  book: BookShelfBook; selected: boolean; onSelect: () => void; editionId?: number;
  metadata?: string; arriving?: boolean;
}) {
  return <BookShelfBookChip book={book} type="button" aria-pressed={selected} onClick={onSelect}
    data-bookshelf-list-book={editionId === undefined ? book.id : undefined} data-bookshelf-edition-option={editionId}
    className={`${listStyles.item} ${arriving ? styles.listArrival : ''} relative flex min-h-24 w-full items-center justify-center rounded-lg border px-4 py-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:min-h-28 sm:py-4`}>
    <span className="block min-w-0 w-full">
      <span className={`${styles.bookTitle} block break-words text-[15px] font-semibold leading-6`}>{book.title}</span>
      {book.creator && <span className={`${styles.bookCreator} mt-1.5 block break-words text-xs leading-5`}>{book.creator}</span>}
      {metadata && <span className={`${styles.bookCreator} mt-1 block break-words text-xs leading-5`}>{metadata}</span>}
    </span>
  </BookShelfBookChip>
}
