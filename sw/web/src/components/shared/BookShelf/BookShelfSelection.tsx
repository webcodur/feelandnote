'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { getBookShelfBook } from '@/actions/books/getBookShelfBook'
import { RetryBlock } from '@/components/ui/pending'
import BookShelfFeature from './BookShelfFeature'
import BookShelfRelations from './BookShelfRelations'
import BookShelfBookList from './BookShelfBookList'
import BookShelfChoiceRow from './BookShelfChoiceRow'
import type { BookShelfBook, BookShelfContext, BookShelfGroup } from './types'

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

export default function BookShelfSelection({ intro, listSubtitle, books, context, pagination }: { intro: string; listSubtitle?: string; books: BookShelfBook[]; context?: BookShelfContext; pagination?: BookShelfGroup['pagination'] }) {
  const locale = useLocale()
  const t = useTranslations('celebPage')
  const [selectedId, setSelectedId] = useState(books[0]?.id)
  const selected = books.find((book) => book.id === selectedId) ?? books[0]
  const selectedContentId = selected?.id
  const [listOpen, setListOpen] = useState(false)
  const closeList = useCallback(() => setListOpen(false), [])
  const [details, setDetails] = useState<{ key: string; book: BookShelfBook | null; failed: boolean } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const detailKey = `${locale}:${selected?.id}`
  const needsDetails = !!selected && !selected.detailsLoaded
  const current = details?.key === detailKey ? details : null

  useEffect(() => {
    if (!needsDetails || !selectedContentId) return
    let alive = true
    requestBook(selectedContentId, locale).then(
      (book) => { if (alive) setDetails({ key: detailKey, book, failed: false }) },
      () => { if (alive) setDetails({ key: detailKey, book: null, failed: true }) },
    )
    return () => { alive = false }
  }, [selectedContentId, needsDetails, locale, detailKey, attempt])

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

  return (
    <div data-bookshelf-selection>
      <BookShelfChoiceRow label={t('sourceWorkLabel')} kind="work" choices={books.map(book => ({ key: book.id, book }))}
        selectedKey={selected.id} onSelect={setSelectedId} onOpenList={() => setListOpen(true)} />
      {listOpen && <BookShelfBookList title={intro} subtitle={listSubtitle} books={books} selectedId={selected.id} onSelect={setSelectedId} onClose={closeList} pagination={pagination} />}
      {current?.failed && <RetryBlock onRetry={() => { setDetails(null); setAttempt((value) => value + 1) }} />}
      <div>
        <BookShelfFeature source={source} sharedEditionKeys={sharedEditionKeys} loading={needsDetails && !current} />
        <BookShelfRelations key={detailKey} contentId={selected.id} bookTitle={source.title} context={context} readerIds={selected.readerIds} />
      </div>
    </div>
  )
}
