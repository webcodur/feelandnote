'use client'

import LibraryIndexItem from '@/components/shared/LibraryIndexItem'
import type { BookShelfBook } from './types'
import styles from './BookShelf.module.css'

export default function BookShelfListItem({ book, selected, onSelect, editionId, metadata, arriving, number }: {
  book: BookShelfBook; selected: boolean; onSelect: () => void; editionId?: number;
  metadata?: string; arriving?: boolean; number: number;
}) {
  const thumbnail = book.editions.find((edition) => edition.id === book.preferredEditionId)?.thumbnailUrl ?? book.thumbnailUrl
  return <LibraryIndexItem title={book.title} creator={book.creator} metadata={metadata} selected={selected} onClick={onSelect}
    thumbnailUrl={thumbnail} number={number}
    data-bookshelf-list-book={editionId === undefined ? book.id : undefined} data-bookshelf-edition-option={editionId}
    className={arriving ? styles.listArrival : undefined} />
}
