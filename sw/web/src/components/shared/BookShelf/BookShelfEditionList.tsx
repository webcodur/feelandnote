'use client'

import { useTranslations } from 'next-intl'
import type { FigureBookEdition } from '@/actions/figure-books/figureBookLocale'
import type { BookShelfBook } from './types'
import LibraryIndexModal from '@/components/shared/LibraryIndexModal'
import LibraryIndexList from '@/components/shared/LibraryIndexList'
import BookShelfListItem from './BookShelfListItem'
import listStyles from './BookShelfList.module.css'

export default function BookShelfEditionList({ source, editions, selectedId, onSelect, onClose }: {
  source: BookShelfBook; editions: FigureBookEdition[]; selectedId?: number;
  onSelect: (id: number) => void; onClose: () => void;
}) {
  const t = useTranslations('celebPage')
  const title = `${t('sourceEditionLabel')}: ${source.title}`
  return <LibraryIndexModal title={title} description={t('sourceEditionListIntro')} count={Math.max(1, editions.length)} onClose={onClose}>
    <LibraryIndexList aria-label={title} selectedKey={selectedId}>
    <div className={listStyles.items} data-bookshelf-edition-list>
      {editions.map((edition, index) => <BookShelfListItem key={edition.id} editionId={edition.id} number={index + 1}
        book={{ ...source, title: edition.title, creator: edition.creator || source.creator,
          thumbnailUrl: edition.thumbnailUrl, preferredEditionId: edition.id }}
        metadata={[edition.publisher, edition.releaseDate?.slice(0, 4)].filter(Boolean).join(' · ')}
        selected={edition.id === selectedId} onSelect={() => onSelect(edition.id)} />)}
      {!editions.length && <BookShelfListItem book={source} number={1} selected onSelect={onClose}
        metadata={[source.publisher, source.releaseDate?.slice(0, 4)].filter(Boolean).join(' · ')} />}
    </div>
    </LibraryIndexList>
  </LibraryIndexModal>
}
