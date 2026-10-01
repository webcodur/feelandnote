'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
import { getBookShelfPeople, type BookShelfPeople } from '@/actions/books/getBookShelfPeople'
import { Link } from '@/i18n/navigation'
import { getCelebProfileUrl } from '@/lib/url'
import { selectBookShelfPeople } from '@/lib/books/bookShelfPeople'
import { RetryBlock } from '@/components/ui/pending'
import PendingMark from '@/components/ui/pending/PendingMark'
import type { BookShelfContext } from './types'
import { BOOK_SHELF_INLINE_PEOPLE } from '@/lib/books/bookShelfUi'
import BookShelfPeopleList from './BookShelfPeopleList'
import BookShelfReading from './BookShelfReading'
import BookShelfArrival from './BookShelfArrival'
import styles from './BookShelf.module.css'

const requests = new Map<string, Promise<BookShelfPeople>>()
function requestPeople(contentId: string, locale: string) {
  const key = `${locale}:${contentId}`
  const existing = requests.get(key)
  if (existing) return existing
  const request = getBookShelfPeople(contentId, locale).catch((error: unknown) => {
    requests.delete(key)
    throw error
  })
  requests.set(key, request)
  if (requests.size > 100) requests.delete(requests.keys().next().value!)
  return request
}

export default function BookShelfRelations({ contentId, bookTitle, context, readerIds }: {
  contentId: string; bookTitle: string; context?: BookShelfContext; readerIds?: string[]
}) {
  const locale = useLocale()
  const t = useTranslations('celebPage')
  const [people, setPeople] = useState<BookShelfPeople | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [listRole, setListRole] = useState<keyof BookShelfPeople | null>(null)
  const closeList = useCallback(() => setListRole(null), [])
  useEffect(() => {
    let alive = true
    requestPeople(contentId, locale).then(
      (result) => { if (alive) setPeople(result) },
      (error) => { console.error('[BookShelfRelations]', error); if (alive) setFailed(true) },
    )
    return () => { alive = false }
  }, [contentId, locale, attempt])
  if (failed) return <BookShelfArrival name="relations" ready><RetryBlock onRetry={() => { setFailed(false); setAttempt((value) => value + 1) }} /></BookShelfArrival>
  if (!people) return <BookShelfArrival name="relations" ready={false}>
    <div role="status" className={`${styles.relations} flex min-h-[68px] items-center gap-3 border-t p-4 sm:px-6`}>
      <PendingMark size="sm" /><span className="text-sm text-text-secondary">{t('bookRelationsLoading')}</span>
    </div>
  </BookShelfArrival>
  const selected = selectBookShelfPeople(people, context, readerIds)
  const primary = context?.kind === 'profession' ? 'read' : context?.kind
  const roles = (['appeared', 'authored', 'read'] as const).filter((role) => selected[role].length)
    .sort((a, b) => Number(b === primary) - Number(a === primary))
  if (!roles.length) return <BookShelfArrival name="relations" ready />
  const roleLabel = (role: keyof BookShelfPeople) => t(`bookRelation${role === 'appeared' ? 'Appeared' : role === 'authored' ? 'Authored' : 'Read'}`)
  const linkClass = 'inline-flex min-h-9 items-center rounded px-2 text-sm text-text-primary outline-none hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent'
  const ownReading = context?.kind === 'read' ? selected.read.find((person) => person.id === context.personId) : undefined
  return (
    <BookShelfArrival name="relations" ready>
    <div data-bookshelf-relations data-content-id={contentId} className={`${styles.relations} space-y-3 border-t p-4 sm:px-6`}>
      {roles.map((role) => {
        const persons = selected[role]
        const own = persons.find((person) => person.id === context?.personId)
        const inline = persons.length <= BOOK_SHELF_INLINE_PEOPLE
        return (
          <div key={role} data-bookshelf-relation={role} className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:grid-cols-[144px_minmax(0,1fr)] sm:gap-x-4">
            <span className="pt-2 text-xs font-medium leading-5 text-text-tertiary sm:text-sm">{roleLabel(role)}</span>
            <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1">
            {inline ? persons.map((person) => (
              <span key={person.id} data-relation-person={person.id}>
                {person.id === context?.personId ? <span className="inline-flex min-h-9 items-center px-2 text-sm font-semibold text-text-primary">{person.name}</span>
                  : <Link href={getCelebProfileUrl(person)} prefetch={false} className={linkClass}>{person.name}</Link>}
              </span>
            )) : <span className="text-sm text-text-primary">{t('bookShelfPeopleCount', { count: persons.length })}{own ? ` · ${own.name}` : ''}</span>}
            {role === 'read' && ownReading && context?.onOpenReview ? (
              <button type="button" onClick={() => context.onOpenReview?.(contentId)} data-bookshelf-open-review
                aria-label={t('bookRelationReadRecordFor', { name: ownReading.name })}
                className={`${linkClass} ms-auto text-accent`}>{t('bookShelfReviewOpen')}<ChevronRight size={14} className="ms-1" aria-hidden /></button>
            ) : role === 'read' && ownReading && persons.length === 1 ? (
              <Link href={`${getCelebProfileUrl(ownReading)}/records?focus=${encodeURIComponent(contentId)}`} prefetch={false}
                aria-label={t('bookRelationReadRecordFor', { name: ownReading.name })} className={`${linkClass} ms-auto text-accent`}>{t('bookShelfReadPage')}<ArrowUpRight size={14} className="ms-1" aria-hidden /></Link>
            ) : (!inline || role === 'read') && (
              <button type="button" onClick={() => setListRole(role)} data-bookshelf-open-people={role}
                aria-label={t('bookShelfPeopleListFor', { role: roleLabel(role), count: persons.length })}
                className={`${linkClass} ms-auto text-accent`}>{t(role === 'read' ? 'bookShelfReadersList' : 'bookShelfPeopleList')}<ChevronRight size={14} className="ms-1" aria-hidden /></button>
            )}
            </div>
          </div>
        )
      })}
      {ownReading && !context?.onOpenReview && <BookShelfReading person={ownReading} />}
      {listRole && <BookShelfPeopleList people={selected[listRole]} contentId={contentId} reading={listRole === 'read'}
        title={t('bookShelfPeopleListFor', { role: roleLabel(listRole), count: selected[listRole].length })} bookTitle={bookTitle} onClose={closeList} />}
    </div>
    </BookShelfArrival>
  )
}
