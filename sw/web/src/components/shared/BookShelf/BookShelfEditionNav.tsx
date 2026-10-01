'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { FigureBookEdition } from '@/actions/figure-books/figureBookLocale'
import type { BookShelfBook } from './types'
import BookShelfChoiceRow from './BookShelfChoiceRow'
import BookShelfEditionList from './BookShelfEditionList'

export default function BookShelfEditionNav({ source, editions = source.editions, index = 0, onSelect }: {
  source: BookShelfBook; editions?: FigureBookEdition[]; index?: number; onSelect?: (id: number) => void;
}) {
  const t = useTranslations('celebPage')
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const choices = editions.length ? editions.map(edition => ({ key: String(edition.id), book: {
    ...source, title: edition.title, creator: edition.creator || source.creator,
    thumbnailUrl: edition.thumbnailUrl, preferredEditionId: edition.id,
  } })) : [{ key: source.id, book: source }]
  return <>
    <BookShelfChoiceRow label={t('sourceEditionLabel')} kind="edition" choices={choices}
      selectedKey={choices[index].key} onSelect={key => { if (editions.length) onSelect?.(Number(key)) }} onOpenList={() => setOpen(true)} />
    {open && <BookShelfEditionList source={source} editions={editions} selectedId={editions[index]?.id}
      onSelect={id => { onSelect?.(id); close() }} onClose={close} />}
  </>
}
