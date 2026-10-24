'use client'

import { useCallback, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { getFactionReadBooks, getFactionProfessionShelf, type FactionMemberShelf } from '@/actions/home/getFactionMemberShelf'
import type { FactionFigureBook } from '@/actions/home/getFactionFigureBooks'
import BookShelf from '@/components/shared/BookShelf/BookShelf'
import { affiliateBookToShelfBook, type BookShelfGroup } from '@/components/shared/BookShelf/types'
import { isThemeBook } from '@/lib/figure-books/themeBooks'
import { isBookShelfAvailable } from '@/lib/books/bookShelf'
import { getProfessionShelfChoices } from '@/lib/books/professionShelf'
import type { AtlasWorld } from '@/components/features/user/explore/myth/atlasNavigationData'

interface Props {
  books: FactionFigureBook[]
  memberIds: string[]
  name: string
  mode: AtlasWorld
}

/** 신화와 팩션은 모으는 관계만 정하고, 공통 책장이 책을 그린다. */
export default function ThemeBookShelf({ books, memberIds, name, mode }: Props) {
  const isMyth = mode === 'myth'
  const t = useTranslations(isMyth ? 'explore.hub.myth' : 'explore.faction')
  const tCeleb = useTranslations('celebPage')
  const tProfession = useTranslations('profession')
  const locale = useLocale()
  const [read, setRead] = useState<FactionFigureBook[]>([])
  const [professionData, setProfessionData] = useState<Pick<FactionMemberShelf, 'profession' | 'professionBooks'> | null>(null)
  const [readState, setReadState] = useState<'idle' | 'loading' | 'failed' | 'ready'>('idle')
  const [professionState, setProfessionState] = useState<'idle' | 'loading' | 'failed' | 'ready'>('idle')
  const memberKey = memberIds.join(',')
  const loadRead = useCallback(() => {
    setReadState('loading')
    void getFactionReadBooks(memberKey.split(',').filter(Boolean), locale)
      .then(result => { setRead(result); setReadState('ready') })
      .catch(error => { console.error('[ThemeBookShelf/read]', error); setReadState('failed') })
  }, [memberKey, locale])
  const loadProfession = useCallback(() => {
    setProfessionState('loading')
    void getFactionProfessionShelf(memberKey.split(',').filter(Boolean), locale)
      .then(result => { setProfessionData(result); setProfessionState('ready') })
      .catch(error => { console.error('[ThemeBookShelf/profession]', error); setProfessionState('failed') })
  }, [memberKey, locale])

  const memberSet = new Set(memberIds)
  const available = books.filter(isBookShelfAvailable)
  const own = available.filter((book) => isThemeBook(book, name, isMyth))
  const ownIds = new Set(own.map((book) => book.contentId))
  const appeared = available.filter((book) => !ownIds.has(book.contentId) && book.appearedIds.some((id) => memberSet.has(id)))
  const authored = available.filter((book) => book.authoredIds.some((id) => memberSet.has(id)))
  const profession = professionData?.profession
  const professionLabel = profession && profession !== 'other' && tProfession.has(profession) ? tProfession(profession) : null
  const professionIntro = professionLabel
    ? tCeleb('professionShelfIntro', { profession: professionLabel }) : tCeleb('relatedShelfIntro')
  const professionShelfBooks = (professionData?.professionBooks ?? []).map(affiliateBookToShelfBook)
  const professionChoices = getProfessionShelfChoices(professionShelfBooks, {
    train: tCeleb('professionTrain'), become: tCeleb('professionBecome'), about: tCeleb('professionAbout'),
    trainIntro: tCeleb('professionTrainIntro'),
    becomeIntro: tCeleb('professionBecomeIntro'), aboutIntro: tCeleb('professionAboutIntro'),
  }, { profession, locale })
  const groups: BookShelfGroup[] = [
    { key: 'theme', context: { memberIds, kind: 'theme' }, label: tCeleb('groupTheme'), intro: t(isMyth ? 'worksLeadOwn' : 'worksThemeLead'), listSubtitle: name, books: own.map(affiliateBookToShelfBook) },
    { key: 'appeared', context: { memberIds, kind: 'appeared' }, label: tCeleb('groupAppeared'), intro: t(isMyth ? 'worksLeadOthers' : 'worksAppearedLead'), books: appeared.map(affiliateBookToShelfBook) },
    { key: 'read', context: { memberIds, kind: 'read' }, label: tCeleb('groupRead'), intro: t('worksReadLead'), books: read.map(affiliateBookToShelfBook), deferred: { state: readState, onLoad: loadRead } },
    { key: 'authored', context: { memberIds, kind: 'authored' }, label: tCeleb('groupAuthored'), intro: t('worksAuthoredLead'), books: authored.map(affiliateBookToShelfBook) },
    { key: 'profession', context: { kind: 'profession' }, label: professionLabel ?? tCeleb('groupProfession'), intro: professionIntro,
      books: professionShelfBooks, choices: professionChoices, deferred: { state: professionState, onLoad: loadProfession } },
  ]
  return <BookShelf groups={groups} ariaLabel={t('worksTitle')} />
}
