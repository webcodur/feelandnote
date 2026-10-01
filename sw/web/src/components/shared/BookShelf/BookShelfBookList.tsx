'use client'

import { useCallback, useId, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BOOK_SHELF_SEARCH_THRESHOLD, searchBookShelf } from '@/lib/books/bookShelfUi'
import { RetryBlock } from '@/components/ui/pending'
import BookShelfListModal from './BookShelfListModal'
import type { BookShelfBook, BookShelfGroup } from './types'
import BookShelfListItem from './BookShelfListItem'
import listStyles from './BookShelfList.module.css'

export default function BookShelfBookList({ title, subtitle, books, selectedId, onSelect, onClose, pagination }: {
  title: string; subtitle?: string; books: BookShelfBook[]; selectedId: string; onSelect: (id: string) => void; onClose: () => void
  pagination?: BookShelfGroup['pagination']
}) {
  const t = useTranslations('celebPage')
  const [query, setQuery] = useState('')
  const [initialBooks] = useState(() => new Set(books.map((book) => book.id)))
  const searchId = useId()
  const close = useCallback(() => onClose(), [onClose])
  const shown = searchBookShelf(books, query)
  const searchable = books.length > BOOK_SHELF_SEARCH_THRESHOLD || !!pagination?.hasMore
  return (
    <BookShelfListModal title={title} subtitle={subtitle} compact={books.length === 1 && !pagination?.hasMore} onClose={close}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="shrink-0 text-sm font-medium text-white/75" aria-live="polite">{t('bookShelfCount', { count: shown.length })}</p>
        {searchable && <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <label htmlFor={searchId} className="sr-only">{t(pagination?.hasMore ? 'bookShelfSearchLoaded' : 'bookShelfSearchAll', { count: books.length })}</label>
        <Search size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-white/50" aria-hidden />
        <input id={searchId} value={query} onChange={(event) => setQuery(event.target.value)} type="search"
          placeholder={t('bookShelfSearchPlaceholder')} data-bookshelf-search
          className="w-full rounded-lg border border-white/20 bg-bg-main py-3 pe-3 ps-10 text-white/90 placeholder:text-white/50 outline-none hover:border-white/50 focus-visible:ring-2 focus-visible:ring-accent" />
        </div>}
      </div>
      <div className={listStyles.items} data-bookshelf-book-list aria-busy={pagination?.loading}>
        {shown.map(book => <BookShelfListItem key={book.id} book={book} selected={book.id === selectedId}
          arriving={!initialBooks.has(book.id)} onSelect={() => { onSelect(book.id); onClose() }} />)}
        {!shown.length && <p className="col-span-full py-6 text-center text-sm text-white/70">{t('bookShelfSearchEmpty')}</p>}
      </div>
      {pagination?.failed ? <RetryBlock onRetry={pagination.onLoadMore} /> : pagination?.hasMore && (
        <button type="button" onClick={pagination.onLoadMore} disabled={pagination.loading} data-bookshelf-more
          aria-busy={pagination.loading} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 outline-none hover:border-white/50 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait disabled:opacity-50">
          {pagination.loading && <Loader2 size={16} className="animate-spin" aria-hidden />}{t('bookShelfLoadMore')}
        </button>
      )}
    </BookShelfListModal>
  )
}
