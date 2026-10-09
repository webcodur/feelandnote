'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { FigureBookContent } from '@/actions/figure-books/getFigureBooks'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import type { CelebFactionBookGroup } from '@/actions/celebs/getCelebFactionBooks'
import BookShelf from '@/components/shared/BookShelf/BookShelf'
import { affiliateBookToShelfBook, figureBookToShelfBook, type BookShelfBook, type BookShelfGroup } from '@/components/shared/BookShelf/types'
import BookShelfAffiliationAddon from './BookShelfAffiliationAddon'
import { getProfessionShelfChoices } from '@/lib/books/professionShelf'

interface Props {
  celebId: string
  celebName?: string
  appeared: FigureBookContent[]
  authored: FigureBookContent[]
  professionBooks: AffiliateBook[]
  profession?: string | null
  factionGroups: CelebFactionBookGroup[]
  /** 가상독백 화면은 감상 도서를 별도 리뷰 구획 대신 책장 분류에 함께 둔다. */
  readBooks?: BookShelfBook[]
  id?: string
  title?: string
}

/** 개인 상세와 도감 인물 창은 자료를 이 어댑터에 넘기고 공통 책장 한 벌을 쓴다. */
export default function CelebBookShelf({ celebId, celebName, appeared, authored, professionBooks, profession, factionGroups, readBooks, id, title }: Props) {
  const t = useTranslations('celebPage')
  const locale = useLocale()
  const tProfession = useTranslations('profession')
  const professionIntro = profession && profession !== 'other' && tProfession.has(profession)
    ? t('professionShelfIntro', { profession: tProfession(profession) }) : t('relatedShelfIntro')
  const [factionId, setFactionId] = useState(factionGroups[0]?.factionId)
  const selectedFaction = factionGroups.find((group) => group.factionId === factionId) ?? factionGroups[0]
  const showReading = readBooks !== undefined
  const professionShelfBooks = professionBooks.map(affiliateBookToShelfBook)
  const professionChoices = getProfessionShelfChoices(professionShelfBooks, {
    train: t('professionTrain'), become: t('professionBecome'), about: t('professionAbout'),
    trainIntro: t('professionTrainIntro'),
    becomeIntro: t('professionBecomeIntro'), aboutIntro: t('professionAboutIntro'),
  }, { profession, locale })
  const groups: BookShelfGroup[] = [
    { key: 'appeared', context: { personId: celebId, kind: 'appeared', showReading }, label: t('groupAppeared'), intro: t('sourceWorksIntro'), books: appeared.map(figureBookToShelfBook) },
    ...(readBooks !== undefined ? [{ key: 'read', context: { personId: celebId, personName: celebName, kind: 'read' as const, showReading }, label: t('groupRead'), intro: t('readShelfIntro'), books: readBooks }] : []),
    { key: 'authored', context: { personId: celebId, kind: 'authored', showReading }, label: t('groupAuthored'), intro: t('authoredWorksIntro'), books: authored.map(figureBookToShelfBook) },
    { key: 'profession', context: { personId: celebId, kind: 'profession', showReading }, label: t('groupProfession'), intro: professionIntro, books: professionShelfBooks, choices: professionChoices },
    {
      key: 'faction', context: { personId: celebId, kind: 'affiliation', showReading }, label: t('groupAffiliation'),
      chipLabel: t('affiliationCount', { count: factionGroups.length }),
      intro: t(selectedFaction?.isMyth ? 'factionShelfIntroMyth' : 'factionShelfIntroFaction'),
      books: selectedFaction?.books.map(affiliateBookToShelfBook) ?? [], selectionKey: selectedFaction?.factionId,
      listGroups: factionGroups.map((group) => ({ key: group.factionId, label: group.factionName, books: group.books.map(affiliateBookToShelfBook) })),
      onSelectListGroup: setFactionId,
      addon: selectedFaction
        ? <BookShelfAffiliationAddon groups={factionGroups} selected={selectedFaction} onSelect={setFactionId} />
        : undefined,
    },
  ]
  return <BookShelf groups={groups} ariaLabel={t('relatedProducts')} id={id} title={title} />
}
