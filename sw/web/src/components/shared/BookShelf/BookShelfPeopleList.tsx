'use client'

import { useId, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import FigurePersonRows from '@/components/features/celeb/FigurePersonRows'
import type { BookShelfPerson } from '@/actions/books/getBookShelfPeople'
import BookShelfListModal from './BookShelfListModal'
import BookShelfReading from './BookShelfReading'
import { BOOK_SHELF_INLINE_PEOPLE } from '@/lib/books/bookShelfUi'

export default function BookShelfPeopleList({ people, reading, title, bookTitle, onClose, isOpen, onSelectPerson }: {
  people: BookShelfPerson[]; reading: boolean; title: string; bookTitle: string; onClose: () => void
  isOpen: boolean; onSelectPerson: (person: BookShelfPerson) => void
}) {
  const t = useTranslations('celebPage')
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const searchId = useId()
  const shown = people.filter((person) => person.name.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <BookShelfListModal title={title} subtitle={bookTitle} onClose={onClose} isOpen={isOpen}>
      {people.length > BOOK_SHELF_INLINE_PEOPLE && <div className="space-y-2">
        <label htmlFor={searchId} className="block text-sm text-text-secondary">{t('bookShelfPeopleSearch')}</label>
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
          <input id={searchId} value={query} onChange={(event) => setQuery(event.target.value)} type="search" data-bookshelf-people-search
            placeholder={t('bookShelfPeopleSearch')}
            className="w-full rounded-lg border border-white/15 bg-bg-main py-3 pe-3 ps-10 text-text-primary outline-none hover:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent" />
        </div>
      </div>}
      <div data-bookshelf-people-list>
        <FigurePersonRows locale={locale}
          gridClassName={reading ? 'grid-cols-1!' : 'grid-cols-1! sm:grid-cols-2! lg:grid-cols-2! xl:grid-cols-2!'}
          onOpenPerson={(person) => {
            const selected = shown.find((item) => item.id === person.id)
            if (selected) onSelectPerson(selected)
          }}
          rows={shown.map((person) => ({
            person: { id: person.id, slug: person.slug, listed: true, name: person.name, avatarUrl: person.avatarUrl ?? null, qid: null },
            subtitle: null,
            footer: reading && (person.review || person.sourceUrl)
              ? <div className="border-t border-white/10 p-2"><BookShelfReading person={person} /></div> : undefined,
          }))} />
        {!shown.length && <p className="py-6 text-center text-sm text-text-secondary">{t('bookShelfPeopleEmpty')}</p>}
      </div>
    </BookShelfListModal>
  )
}
