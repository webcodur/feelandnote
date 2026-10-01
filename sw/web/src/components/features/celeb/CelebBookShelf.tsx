'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { FigureBookContent } from '@/actions/figure-books/getFigureBooks'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import type { CelebFactionBookGroup } from '@/actions/celebs/getCelebFactionBooks'
import BookShelf from '@/components/shared/BookShelf/BookShelf'
import { affiliateBookToShelfBook, figureBookToShelfBook, type BookShelfGroup } from '@/components/shared/BookShelf/types'
import { useCelebReadShelf } from './useCelebReadShelf'
import BookShelfAffiliationAddon from './BookShelfAffiliationAddon'

interface Props {
  celebId: string
  appeared: FigureBookContent[]
  authored: FigureBookContent[]
  read: { books: AffiliateBook[]; nextPage: number; hasMore: boolean }
  professionBooks: AffiliateBook[]
  profession?: string | null
  factionGroups: CelebFactionBookGroup[]
  id?: string
  title?: string
  onOpenReview?: (contentId: string) => void
}

/** 개인 상세와 도감 인물 창은 자료를 이 어댑터에 넘기고 공통 책장 한 벌을 쓴다. */
export default function CelebBookShelf({ celebId, appeared, authored, read, professionBooks, profession, factionGroups, id, title, onOpenReview }: Props) {
  const t = useTranslations('celebPage')
  const tProfession = useTranslations('profession')
  const professionIntro = profession && profession !== 'other' && tProfession.has(profession)
    ? t('professionShelfIntro', { profession: tProfession(profession) }) : t('relatedShelfIntro')
  const reading = useCelebReadShelf({ userId: celebId, initialBooks: read.books, initialNextPage: read.nextPage, initialHasMore: read.hasMore })
  const [factionId, setFactionId] = useState(factionGroups[0]?.factionId)
  const selectedFaction = factionGroups.find((group) => group.factionId === factionId) ?? factionGroups[0]
  const groups: BookShelfGroup[] = [
    { key: 'appeared', context: { personId: celebId, kind: 'appeared' }, label: t('groupAppeared'), intro: t('sourceWorksIntro'), books: appeared.map(figureBookToShelfBook) },
    { key: 'read', context: { personId: celebId, kind: 'read', onOpenReview }, label: t('groupRead'), intro: t('readShelfIntro'), books: reading.books.map(affiliateBookToShelfBook),
      pagination: { hasMore: reading.hasMore, loading: reading.status === 'loading', failed: reading.status === 'failed', onLoadMore: reading.loadMore } },
    { key: 'authored', context: { personId: celebId, kind: 'authored' }, label: t('groupAuthored'), intro: t('authoredWorksIntro'), books: authored.map(figureBookToShelfBook) },
    { key: 'profession', context: { personId: celebId, kind: 'profession' }, label: t('groupProfession'), intro: professionIntro, books: professionBooks.map(affiliateBookToShelfBook) },
  ]
  if (selectedFaction) groups.push({
    key: 'faction', context: { personId: celebId, kind: 'affiliation' }, label: t('groupAffiliation'),
    intro: t(selectedFaction.isMyth ? 'factionShelfIntroMyth' : 'factionShelfIntroFaction'),
    books: selectedFaction.books.map(affiliateBookToShelfBook), selectionKey: selectedFaction.factionId,
    addon: <BookShelfAffiliationAddon groups={factionGroups} selected={selectedFaction} onSelect={setFactionId} />,
  })
  return <BookShelf groups={groups} ariaLabel={t('relatedProducts')} id={id} title={title} />
}
