'use client'

import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowUpRight, Search } from 'lucide-react'
import type { BookShelfPerson } from '@/actions/books/getBookShelfPeople'
import { Link } from '@/i18n/navigation'
import { getCelebProfileUrl } from '@/lib/url'
import BookShelfListModal from './BookShelfListModal'
import BookShelfReading from './BookShelfReading'
import { BOOK_SHELF_INLINE_PEOPLE } from '@/lib/books/bookShelfUi'

export default function BookShelfPeopleList({ people, contentId, reading, title, bookTitle, onClose }: {
  people: BookShelfPerson[]; contentId: string; reading: boolean; title: string; bookTitle: string; onClose: () => void
}) {
  const t = useTranslations('celebPage')
  const [query, setQuery] = useState('')
  const searchId = useId()
  const shown = people.filter((person) => person.name.toLowerCase().includes(query.trim().toLowerCase()))
  const linkClass = 'inline-flex min-h-10 items-center rounded px-2 text-sm outline-none hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent'
  return (
    <BookShelfListModal title={title} subtitle={bookTitle} onClose={onClose}>
      {people.length > BOOK_SHELF_INLINE_PEOPLE && <div className="space-y-2">
        <label htmlFor={searchId} className="block text-sm text-text-secondary">{t('bookShelfPeopleSearch')}</label>
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
          <input id={searchId} value={query} onChange={(event) => setQuery(event.target.value)} type="search" data-bookshelf-people-search
            placeholder={t('bookShelfPeopleSearch')}
            className="w-full rounded-lg border border-white/15 bg-bg-main py-3 pe-3 ps-10 text-text-primary outline-none hover:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent" />
        </div>
      </div>}
      <div className={reading ? 'space-y-3' : 'grid gap-1 sm:grid-cols-2'} data-bookshelf-people-list>
        {shown.map((person) => (
          <div key={person.id} data-relation-person={person.id}>
            {!reading && <Link href={getCelebProfileUrl(person)} prefetch={false}
              className={`${linkClass} min-h-12 w-full justify-between gap-3 px-3 font-semibold text-text-primary`}>
              <span className="break-words">{person.name}</span><ArrowUpRight size={14} className="shrink-0 text-text-tertiary" aria-hidden />
            </Link>}
            {reading && <div className="rounded-lg border border-white/10 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={getCelebProfileUrl(person)} prefetch={false} className={`${linkClass} font-semibold text-text-primary`}>{person.name}</Link>
                <Link href={`${getCelebProfileUrl(person)}/records?focus=${encodeURIComponent(contentId)}`} prefetch={false}
                  aria-label={t('bookRelationReadRecordFor', { name: person.name })} className={`${linkClass} text-accent`}>{t('bookShelfReadPage')}<ArrowUpRight size={14} className="ms-1" aria-hidden /></Link>
              </div>
              <BookShelfReading person={person} />
            </div>}
          </div>
        ))}
        {!shown.length && <p className="py-6 text-center text-sm text-text-secondary">{t('bookShelfPeopleEmpty')}</p>}
      </div>
    </BookShelfListModal>
  )
}
