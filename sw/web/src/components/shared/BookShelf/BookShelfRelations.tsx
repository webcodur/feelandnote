'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { getBookShelfPeople, type BookShelfPeople, type BookShelfPerson } from '@/actions/books/getBookShelfPeople'
import { selectBookShelfPeople } from '@/lib/books/bookShelfPeople'
import { RetryBlock } from '@/components/ui/pending'
import PendingMark from '@/components/ui/pending/PendingMark'
import type { BookShelfContext } from './types'
import { BOOK_SHELF_INLINE_PEOPLE } from '@/lib/books/bookShelfUi'
import BookShelfPeopleList from './BookShelfPeopleList'
import BookShelfArrival from './BookShelfArrival'
import BookShelfPersonModal from './BookShelfPersonModal'
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
  const [selectedPerson, setSelectedPerson] = useState<BookShelfPerson | null>(null)
  const closePerson = useCallback(() => setSelectedPerson(null), [])
  const openPerson = (person: BookShelfPerson) => setSelectedPerson(people?.read.find((reader) => reader.id === person.id) ?? person)
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
  const actionClass = `${linkClass} col-start-2 row-start-1 justify-self-end text-xs text-accent sm:col-start-3 sm:text-sm`
  return (
    <BookShelfArrival name="relations" ready>
    <div data-bookshelf-relations data-content-id={contentId} className={`${styles.relations} space-y-2 border-t p-4 sm:px-6`}>
      <div className="divide-y divide-white/[0.07]">
      {roles.map((role) => {
        const persons = selected[role]
        const inlinePeople = persons.slice(0, BOOK_SHELF_INLINE_PEOPLE)
        const remaining = persons.length - inlinePeople.length
        return (
          <div key={role} data-bookshelf-relation={role} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[144px_minmax(0,1fr)_auto] sm:gap-x-4">
            <span className="col-start-1 row-start-1 text-xs font-medium leading-5 text-text-tertiary sm:text-sm">{roleLabel(role)} <span className="tabular-nums">({persons.length})</span></span>
            <div className="col-span-2 col-start-1 row-start-2 flex min-w-0 flex-wrap items-center gap-1 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            {inlinePeople.map((person) => (
              <span key={person.id} data-relation-person={person.id}>
                {person.id === context?.personId ? <span className="inline-flex min-h-9 items-center rounded bg-white/5 px-2 text-sm font-semibold text-text-primary">{person.name}</span>
                  : <button type="button" onClick={() => openPerson(person)} aria-haspopup="dialog" className={`${linkClass} bg-white/5`}>{person.name}</button>}
              </span>
            ))}
            {remaining > 0 && <span className="px-1 text-xs tabular-nums text-text-secondary">+{remaining}</span>}
            </div>
            {(remaining > 0 || role === 'read') && (
              <button type="button" onClick={() => setListRole(role)} data-bookshelf-open-people={role}
                aria-label={t('bookShelfPeopleListFor', { role: roleLabel(role), count: persons.length })}
                className={actionClass}>{t(role === 'read' ? 'bookShelfReadersList' : 'bookShelfPeopleList')}<ChevronRight size={14} className="ms-1 shrink-0" aria-hidden /></button>
            )}
          </div>
        )
      })}
      </div>
      {listRole && <BookShelfPeopleList people={selected[listRole]} reading={listRole === 'read'}
        title={t('bookShelfPeopleListFor', { role: roleLabel(listRole), count: selected[listRole].length })} bookTitle={bookTitle} onClose={closeList}
        isOpen={!selectedPerson} onSelectPerson={openPerson} />}
      {selectedPerson && <BookShelfPersonModal key={selectedPerson.id} person={selectedPerson} bookTitle={bookTitle} onClose={closePerson} />}
    </div>
    </BookShelfArrival>
  )
}
