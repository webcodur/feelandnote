'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BOOK_SHELF_SEARCH_THRESHOLD, searchBookShelf } from '@/lib/books/bookShelfUi'
import { RetryBlock } from '@/components/ui/pending'
import LibraryIndexModal from '@/components/shared/LibraryIndexModal'
import LibraryIndexList from '@/components/shared/LibraryIndexList'
import ArchiveSearchControls from '@/components/features/user/contentLibrary/controlBar/ArchiveSearchControls'
import type { BookShelfBook, BookShelfGroup } from './types'
import BookShelfListItem from './BookShelfListItem'
import listStyles from './BookShelfList.module.css'

export default function BookShelfBookList({ selectionKey, title, subtitle, books, selectedId, onSelect, onClose, pagination, categoryPicker, indexId }: {
  selectionKey: string
  title: string; subtitle?: string; books: BookShelfBook[]; selectedId: string; onSelect: (id: string) => void; onClose: () => void
  pagination?: BookShelfGroup['pagination']
  categoryPicker?: ReactNode
  indexId: string
}) {
  const t = useTranslations('celebPage')
  const [search, setSearch] = useState({ selectionKey, query: '', appliedQuery: '' })
  const { query, appliedQuery } = search.selectionKey === selectionKey ? search : { query: '', appliedQuery: '' }
  const updateSearch = (values: { query?: string; appliedQuery?: string }) => setSearch({ selectionKey, query, appliedQuery, ...values })
  const [initialBooks] = useState(() => new Set(books.map((book) => book.id)))
  const close = useCallback(() => onClose(), [onClose])
  const shown = searchBookShelf(books, appliedQuery)
  const searchable = Boolean(categoryPicker) || books.length > BOOK_SHELF_SEARCH_THRESHOLD || !!pagination?.hasMore
  return (
    <LibraryIndexModal title={title} description={subtitle} count={shown.length} onClose={close} animateHeight controls={<>
      {categoryPicker}
      {searchable && <ArchiveSearchControls searchQuery={query} onSearchChange={(query) => updateSearch({ query })}
        onSearch={() => updateSearch({ appliedQuery: query.trim() })} onClearSearch={() => updateSearch({ query: '', appliedQuery: '' })}
        hasAppliedSearch={Boolean(appliedQuery)} compact fullWidth className={categoryPicker ? 'mt-2' : undefined}
        inputLabel={t(pagination?.hasMore ? 'bookShelfSearchLoaded' : 'bookShelfSearchAll', { count: books.length })} />}
    </>}>
      <LibraryIndexList id={indexId} aria-label={title} selectedKey={selectedId} resetKey={`${selectionKey}:${appliedQuery}`} data-bookshelf-list-dialog>
      <div className={listStyles.items} data-bookshelf-book-list aria-busy={pagination?.loading}>
        {shown.map(book => <BookShelfListItem key={book.id} book={book} number={books.indexOf(book) + 1} selected={book.id === selectedId}
          arriving={!initialBooks.has(book.id)} onSelect={() => { onSelect(book.id); onClose() }} />)}
        {!shown.length && <p className="col-span-full py-6 text-center text-sm text-white/70">{t('bookShelfSearchEmpty')}</p>}
      </div>
      {pagination?.failed ? <RetryBlock onRetry={pagination.onLoadMore} /> : pagination?.hasMore && (
        <button type="button" onClick={pagination.onLoadMore} disabled={pagination.loading} data-bookshelf-more
          aria-busy={pagination.loading} className="flex min-h-11 w-full items-center justify-center gap-2 border-t border-white/15 bg-white/5 px-3 py-1 text-sm font-medium text-white/90 outline-none hover:border-white/50 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait disabled:opacity-50">
          {pagination.loading && <Loader2 size={16} className="animate-spin" aria-hidden />}{t('bookShelfLoadMore')}
        </button>
      )}
      </LibraryIndexList>
    </LibraryIndexModal>
  )
}
