'use client'

import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { useLocale, useTranslations } from 'next-intl'
import { getBookShelfBook } from '@/actions/books/getBookShelfBook'
import { RetryBlock } from '@/components/ui/pending'
import BookShelfFeature from './BookShelfFeature'
import BookShelfRelations from './BookShelfRelations'
import BookShelfBookList from './BookShelfBookList'
import { LIBRARY_DETAIL_FRAME_CLASS, LibraryArrowButton, LibraryBottomNavigation, LibraryTitleHeader } from '@/components/shared/LibraryDetailNavigation'
import type { BookShelfBook, BookShelfContext, BookShelfGroup } from './types'

const BookShelfReviewDetail = dynamic(() => import('./BookShelfReviewDetail'))

const requests = new Map<string, Promise<BookShelfBook | null>>()
function requestBook(id: string, locale: string) {
  const key = `${locale}:${id}`
  const existing = requests.get(key)
  if (existing) return existing
  const request = getBookShelfBook(id, locale).catch((error: unknown) => {
    requests.delete(key)
    throw error
  })
  requests.set(key, request)
  if (requests.size > 100) requests.delete(requests.keys().next().value!)
  return request
}

export default function BookShelfSelection({ selectionKey, intro, listSubtitle, books, context, pagination, listOpen, onListOpenChange, categoryPicker, titlePulseRequest }: {
  selectionKey: string;
  intro: string; listSubtitle?: string; books: BookShelfBook[]; context?: BookShelfContext; pagination?: BookShelfGroup['pagination'];
  listOpen: boolean; onListOpenChange: (open: boolean) => void; categoryPicker?: ReactNode;
  titlePulseRequest?: number;
}) {
  const locale = useLocale()
  const t = useTranslations('celebPage')
  const indexId = useId()
  const [selections, setSelections] = useState<Record<string, string>>({})
  const selected = books.find((book) => book.id === selections[selectionKey]) ?? books[0]
  const setSelectedId = (id: string) => setSelections((current) => ({ ...current, [selectionKey]: id }))
  const selectedContentId = selected?.id
  const contentIds = useMemo(() => books.map(book => book.id), [books])
  const showReview = context?.kind === 'read' && !!context.personId && !!selected?.readingRecord
  const closeList = useCallback(() => onListOpenChange(false), [onListOpenChange])
  const [details, setDetails] = useState<Record<string, { book: BookShelfBook | null; failed: boolean }>>({})
  const [attempt, setAttempt] = useState(0)
  const detailKey = `${locale}:${selected?.id}`
  const needsDetails = !!selected && !selected.detailsLoaded && !showReview
  const current = details[detailKey]

  useEffect(() => {
    if (!needsDetails || !selectedContentId || current) return
    let alive = true
    requestBook(selectedContentId, locale).then(
      (book) => { if (alive) setDetails((value) => ({ ...value, [detailKey]: { book, failed: false } })) },
      () => { if (alive) setDetails((value) => ({ ...value, [detailKey]: { book: null, failed: true } })) },
    )
    return () => { alive = false }
  }, [selectedContentId, needsDetails, locale, detailKey, attempt, current])

  if (!selected) return null
  const source = current?.book
    ? { ...current.book, title: selected.title, preferredEditionId: selected.preferredEditionId ?? current.book.preferredEditionId, readerIds: selected.readerIds }
    : selected
  const worksByEdition = new Map<string, Set<string>>()
  for (const book of books) for (const edition of book.editions) {
    const key = edition.isbn?.trim() || `title:${edition.title.trim().toLowerCase()}`
    if (key === 'title:') continue
    const ids = worksByEdition.get(key) ?? new Set<string>()
    ids.add(book.id)
    worksByEdition.set(key, ids)
  }
  const sharedEditionKeys = new Set([...worksByEdition].filter(([, ids]) => ids.size > 1).map(([key]) => key))
  const selectedIndex = books.findIndex((book) => book.id === selected.id)
  const goPrevious = () => setSelectedId(books[(selectedIndex - 1 + books.length) % books.length].id)
  const goNext = () => setSelectedId(books[(selectedIndex + 1) % books.length].id)
  const disabled = books.length <= 1
  const previousLabel = t('records.previous')
  const nextLabel = t('records.next')

  return (
    <div data-bookshelf-selection>
      {listOpen && <BookShelfBookList selectionKey={selectionKey} title={t('bookShelfBookList')} subtitle={listSubtitle ?? intro} books={books} selectedId={selected.id} onSelect={setSelectedId} onClose={closeList} pagination={pagination} categoryPicker={categoryPicker} indexId={indexId} />}
      <div className={LIBRARY_DETAIL_FRAME_CLASS} data-bookshelf-detail>
        <LibraryArrowButton direction="previous" label={previousLabel} disabled={disabled} placement="desktop" onClick={goPrevious} testPrefix="bookshelf" />
        <LibraryTitleHeader title={selected.title} creator={selected.creator?.replace(/\^/g, ', ') ?? null}
          previousLabel={previousLabel} nextLabel={nextLabel} disabled={disabled} onPrevious={goPrevious} onNext={goNext} testPrefix="bookshelf"
          indexControl={{ label: t('bookShelfBookList'), isOpen: listOpen, indexId, onToggle: () => onListOpenChange(!listOpen), pulseRequest: titlePulseRequest }} />
        <div className="col-start-1 row-start-2 min-w-0 md:col-start-2">
          {current?.failed && <RetryBlock onRetry={() => {
            setDetails((value) => { const next = { ...value }; delete next[detailKey]; return next })
            setAttempt((value) => value + 1)
          }} />}
          {showReview ? <BookShelfReviewDetail record={selected.readingRecord!} celebId={context!.personId!}
            ownerNickname={context?.personName} contentIds={contentIds} selectedIndex={selectedIndex} /> : <>
            <BookShelfFeature source={source} sharedEditionKeys={sharedEditionKeys} loading={needsDetails && !current} />
            <BookShelfRelations key={detailKey} contentId={selected.id} bookTitle={source.title} context={context} readerIds={selected.readerIds} />
          </>}
          <LibraryBottomNavigation label={t('sourceWorkPickerLabel')} previousLabel={previousLabel} nextLabel={nextLabel}
            disabled={disabled} onPrevious={goPrevious} onNext={goNext} testPrefix="bookshelf" />
        </div>
        <LibraryArrowButton direction="next" label={nextLabel} disabled={disabled} placement="desktop" onClick={goNext} testPrefix="bookshelf" />
      </div>
    </div>
  )
}
