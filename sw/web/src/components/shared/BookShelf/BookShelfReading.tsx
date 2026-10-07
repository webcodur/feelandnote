'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import FormattedText from '@/components/ui/FormattedText'
import SourceLink from '@/components/ui/SourceLink'
import { parseSourceUrls } from '@feelandnote/shared/lib/source-links'
import type { BookShelfPerson } from '@/actions/books/getBookShelfPeople'
import styles from './BookShelf.module.css'

export default function BookShelfReading({ person }: { person: BookShelfPerson }) {
  const t = useTranslations('celebPage')
  const tHome = useTranslations('home.ui')
  const [open, setOpen] = useState(false)
  const [revealedReview, setRevealedReview] = useState<string | null>(null)
  const sourceUrl = parseSourceUrls(person.sourceUrl).length ? person.sourceUrl : null
  if (!person.review && !sourceUrl) return null
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)} className={`${styles.reading} rounded-lg px-3 py-2`} data-bookshelf-reading>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded text-sm text-text-secondary outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
        <span>{t('bookRelationReadBackground', { name: person.name })}</span>
        <span className="flex shrink-0 items-center gap-1 text-xs"><span>{t(open ? 'bookShelfCollapse' : 'bookShelfExpand')}</span><ChevronDown size={16} className={open ? 'rotate-180' : ''} aria-hidden /></span>
      </summary>
      {person.review && (person.isSpoiler && revealedReview !== person.review
        ? <button type="button" onClick={() => setRevealedReview(person.review ?? null)}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded border border-white/10 px-3 text-sm text-text-secondary outline-none hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">
          {tHome('contentReviewSpoiler')}
        </button>
        : <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-primary"><FormattedText text={person.review} /></p>)}
      {sourceUrl && <SourceLink sourceUrl={sourceUrl} className="mt-2 inline-flex min-h-10 items-center rounded px-2 text-sm text-accent outline-none hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-accent">{t('bookRelationSource')}</SourceLink>}
    </details>
  )
}
