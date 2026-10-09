'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { useLocale, useTranslations } from 'next-intl'
import { getBookShelfBook } from '@/actions/books/getBookShelfBook'
import { RetryBlock } from '@/components/ui/pending'
import BookShelfFeature from './BookShelfFeature'
import BookShelfRelations, { prefetchBookShelfPeople } from './BookShelfRelations'
import { prefetchBookIntroduction } from '@/hooks/useBookIntroduction'
import { TOP_OVERLAY_MIN_BOTTOM, topOverlayBottom } from '@/lib/utils/topOverlayBottom'
import BookShelfBookList from './BookShelfBookList'
import { LIBRARY_DETAIL_FRAME_CLASS, LibraryArrowButton, LibraryBottomNavigation, LibraryTitleHeader } from '@/components/shared/LibraryDetailNavigation'
import type { BookShelfBook, BookShelfContext, BookShelfGroup, BookShelfListGroup } from './types'

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

export default function BookShelfSelection({ selectionKey, intro, listSubtitle, books, context, pagination, listOpen, onListOpenChange, categoryPicker, titlePulseRequest, listGroups, onSelectListGroup }: {
  selectionKey: string;
  intro: string; listSubtitle?: string; books: BookShelfBook[]; context?: BookShelfContext; pagination?: BookShelfGroup['pagination'];
  listOpen: boolean; onListOpenChange: (open: boolean) => void; categoryPicker?: ReactNode;
  titlePulseRequest?: number;
  listGroups?: (BookShelfListGroup & { selectionKey: string })[];
  onSelectListGroup?: (key: string) => void;
}) {
  const locale = useLocale()
  const t = useTranslations('celebPage')
  const indexId = useId()
  const [selections, setSelections] = useState<Record<string, string>>({})
  const selected = books.find((book) => book.id === selections[selectionKey]) ?? books[0]
  const setSelectedId = (id: string) => setSelections((current) => ({ ...current, [selectionKey]: id }))
  const selectListBook = (id: string, groupKey?: string) => {
    const group = listGroups?.find((item) => item.key === groupKey)
    setSelections((current) => ({ ...current, [group?.selectionKey ?? selectionKey]: id }))
    if (group) onSelectListGroup?.(group.key)
  }
  const selectedContentId = selected?.id
  const selectedIndex = books.findIndex((book) => book.id === selectedContentId)
  const nextBook = books.length > 1 ? books[(selectedIndex + 1) % books.length] : undefined
  const detailRef = useRef<HTMLDivElement>(null)
  const revealIdRef = useRef<string | null>(null)
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

  useEffect(() => {
    if (!nextBook) return
    if (nextBook.thumbnailUrl) { const image = new Image(); image.src = nextBook.thumbnailUrl }
    if (context?.kind === 'read' && context.personId && nextBook.readingRecord) return
    let alive = true
    prefetchBookShelfPeople(nextBook.id, locale)
    const key = `${locale}:${nextBook.id}`
    const request = nextBook.detailsLoaded ? Promise.resolve(nextBook) : requestBook(nextBook.id, locale)
    void request.then((book) => {
      if (!book) return
      if (alive && !nextBook.detailsLoaded) setDetails((value) => ({ ...value, [key]: { book, failed: false } }))
      const edition = book.editions.find((item) => item.id === (nextBook.preferredEditionId ?? book.preferredEditionId)) ?? book.editions[0]
      const thumbnail = edition?.thumbnailUrl ?? book.thumbnailUrl
      if (thumbnail && thumbnail !== nextBook.thumbnailUrl) { const image = new Image(); image.src = thumbnail }
      prefetchBookIntroduction(edition?.bookIntroduction ?? book.bookIntroduction, locale, edition?.description ?? book.description)
    }).catch(() => {})
    return () => { alive = false }
  }, [nextBook, locale, context?.kind, context?.personId])

  useLayoutEffect(() => {
    if (revealIdRef.current !== selectedContentId) { revealIdRef.current = null; return }
    revealIdRef.current = null
    const detail = detailRef.current
    if (!detail) return
    const overlayBottom = topOverlayBottom(detail, 0)
    const title = detail.querySelector<HTMLElement>('[data-testid="bookshelf-selected-title"]')?.getBoundingClientRect()
    if (title && title.top >= overlayBottom && title.bottom <= window.innerHeight) return
    const limit = Math.max(overlayBottom, TOP_OVERLAY_MIN_BOTTOM) + 8
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    window.scrollTo({ top: window.scrollY + detail.getBoundingClientRect().top - limit, behavior })
  }, [selectedContentId])

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
  const navigate = (offset: number) => {
    if (books.length <= 1) return
    const id = books[(selectedIndex + offset + books.length) % books.length].id
    revealIdRef.current = id
    setSelectedId(id)
  }
  const goPrevious = () => navigate(-1)
  const goNext = () => navigate(1)
  const disabled = books.length <= 1
  const previousLabel = t('records.previous')
  const nextLabel = t('records.next')

  return (
    <div data-bookshelf-selection>
      {listOpen && <BookShelfBookList selectionKey={selectionKey} title={t('bookShelfBookList')} subtitle={listSubtitle ?? intro} books={books} listGroups={listGroups}
        selectedGroupKey={listGroups?.find((group) => group.selectionKey === selectionKey)?.key} selectedId={selected.id} onSelect={selectListBook} onClose={closeList} pagination={pagination} categoryPicker={categoryPicker} indexId={indexId} />}
      <div ref={detailRef} className={LIBRARY_DETAIL_FRAME_CLASS} data-bookshelf-detail>
        <LibraryArrowButton direction="previous" label={previousLabel} disabled={disabled} placement="desktop" onClick={goPrevious} testPrefix="bookshelf" />
        <LibraryTitleHeader title={selected.title} creator={selected.creator?.replace(/\^/g, ', ') ?? null}
          previousLabel={previousLabel} nextLabel={nextLabel} disabled={disabled} onPrevious={goPrevious} onNext={goNext} testPrefix="bookshelf"
          indexControl={{ label: t('bookShelfBookList'), isOpen: listOpen, indexId, onToggle: () => onListOpenChange(!listOpen), pulseRequest: titlePulseRequest }} />
        <div className="col-start-1 row-start-2 min-w-0 md:col-start-2">
          {current?.failed && <RetryBlock onRetry={() => {
            setDetails((value) => { const next = { ...value }; delete next[detailKey]; return next })
            setAttempt((value) => value + 1)
          }} />}
          {(selected.selectionReason || selected.professionCategory === 'train') && <div
            className="mx-3 my-4 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-text-secondary sm:mx-4 md:mx-5" data-bookshelf-guidance>
            {selected.professionCategory === 'train' && <p className="mb-2 text-xs font-semibold text-accent" data-profession-reading-order>
              {t('professionReadingOrder', { current: selectedIndex + 1, total: books.length })}
            </p>}
            {selected.selectionReason && <p>{selected.selectionReason}</p>}
          </div>}
          {showReview ? <BookShelfReviewDetail record={selected.readingRecord!} celebId={context!.personId!}
            ownerNickname={context?.personName} contentIds={contentIds} selectedIndex={selectedIndex} expanded={context?.expandedReading} /> : <>
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
