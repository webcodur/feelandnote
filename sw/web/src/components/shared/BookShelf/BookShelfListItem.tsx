'use client'

import LibraryIndexItem from '@/components/shared/LibraryIndexItem'
import { useTranslations } from 'next-intl'
import type { BookShelfBook } from './types'
import styles from './BookShelf.module.css'

export default function BookShelfListItem({ book, selected, onSelect, editionId, metadata, arriving, number }: {
  book: BookShelfBook; selected: boolean; onSelect: () => void; editionId?: number;
  metadata?: string; arriving?: boolean; number: number;
}) {
  const t = useTranslations('content.reviewModal')
  const details = [book.readingRecord?.review_approved_at ? t('edited') : null, metadata].filter(Boolean).join(' · ')
  const thumbnail = book.editions.find((edition) => edition.id === book.preferredEditionId)?.thumbnailUrl ?? book.thumbnailUrl
  return <LibraryIndexItem title={book.title} creator={book.creator} metadata={details || undefined} selected={selected} onClick={onSelect}
    thumbnailUrl={thumbnail} number={number}
    data-bookshelf-list-book={editionId === undefined ? book.id : undefined} data-bookshelf-edition-option={editionId}
    className={arriving ? styles.listArrival : undefined} />
}
