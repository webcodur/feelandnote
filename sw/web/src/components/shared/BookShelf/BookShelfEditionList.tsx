'use client'

import { useTranslations } from 'next-intl'
import type { FigureBookEdition } from '@/actions/figure-books/figureBookLocale'
import type { BookShelfBook } from './types'
import BookShelfListModal from './BookShelfListModal'
import BookShelfListItem from './BookShelfListItem'
import listStyles from './BookShelfList.module.css'

export default function BookShelfEditionList({ source, editions, selectedId, onSelect, onClose }: {
  source: BookShelfBook; editions: FigureBookEdition[]; selectedId?: number;
  onSelect: (id: number) => void; onClose: () => void;
}) {
  const t = useTranslations('celebPage')
  return <BookShelfListModal title={`${t('sourceEditionLabel')}: ${t('sourceEditionListIntro')}`} subtitle={source.title} compact={editions.length <= 1} onClose={onClose}>
    <p className="text-sm font-medium text-white/75">{t('bookShelfEditionCount', { count: Math.max(1, editions.length) })}</p>
    <div className={listStyles.items} data-bookshelf-edition-list>
      {editions.map(edition => <BookShelfListItem key={edition.id} editionId={edition.id}
        book={{ ...source, title: edition.title, creator: edition.creator || source.creator,
          thumbnailUrl: edition.thumbnailUrl, preferredEditionId: edition.id }}
        metadata={[edition.publisher, edition.releaseDate?.slice(0, 4)].filter(Boolean).join(' · ')}
        selected={edition.id === selectedId} onSelect={() => onSelect(edition.id)} />)}
      {!editions.length && <BookShelfListItem book={source} selected onSelect={onClose}
        metadata={[source.publisher, source.releaseDate?.slice(0, 4)].filter(Boolean).join(' · ')} />}
    </div>
  </BookShelfListModal>
}
