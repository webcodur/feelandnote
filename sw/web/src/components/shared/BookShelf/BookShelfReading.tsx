'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import type { BookShelfPerson } from '@/actions/books/getBookShelfPeople'
import styles from './BookShelf.module.css'

export default function BookShelfReading({ person }: { person: BookShelfPerson }) {
  const t = useTranslations('celebPage')
  const [open, setOpen] = useState(false)
  const sourceUrl = /^https?:\/\//.test(person.sourceUrl ?? '') ? person.sourceUrl : null
  if (!person.review && !sourceUrl) return null
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)} className={`${styles.reading} rounded-lg px-3 py-2`} data-bookshelf-reading>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded text-sm text-text-secondary outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
        <span>{t('bookRelationReadBackground', { name: person.name })}</span>
        <span className="flex shrink-0 items-center gap-1 text-xs"><span>{t(open ? 'bookShelfCollapse' : 'bookShelfExpand')}</span><ChevronDown size={16} className={open ? 'rotate-180' : ''} aria-hidden /></span>
      </summary>
      {person.review && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-primary">{person.review}</p>}
      {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-10 items-center rounded px-2 text-sm text-accent outline-none hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-accent">{t('bookRelationSource')}</a>}
    </details>
  )
}
