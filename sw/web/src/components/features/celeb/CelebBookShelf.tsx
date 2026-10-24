'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { FigureBookContent } from '@/actions/figure-books/getFigureBooks'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import type { CelebFactionBookGroup } from '@/actions/celebs/getCelebFactionBooks'
import BookShelf from '@/components/shared/BookShelf/BookShelf'
import { affiliateBookToShelfBook, figureBookToShelfBook, type BookShelfBook, type BookShelfGroup } from '@/components/shared/BookShelf/types'
import BookShelfAffiliationAddon from './BookShelfAffiliationAddon'
import { getProfessionShelfChoices } from '@/lib/books/professionShelf'
import { getProfessionBooks } from '@/actions/books/getProfessionBooks'
import { getCelebFactionBooks } from '@/actions/celebs/getCelebFactionBooks'

interface Props {
  celebId: string
  celebName?: string
  appeared: FigureBookContent[]
  authored: FigureBookContent[]
  professionBooks: AffiliateBook[]
  profession?: string | null
  factionGroups: CelebFactionBookGroup[]
  supplementaryDeferred?: boolean
  /** 가상독백 화면은 감상 도서를 별도 리뷰 구획 대신 책장 분류에 함께 둔다. */
  readBooks?: BookShelfBook[]
  id?: string
  title?: string
}

/** 개인 상세와 도감 인물 창은 자료를 이 어댑터에 넘기고 공통 책장 한 벌을 쓴다. */
export default function CelebBookShelf(props: Props) {
  const locale = useLocale()
  return <CelebBookShelfBody key={`${props.celebId}:${locale}`} {...props} />
}

function CelebBookShelfBody({ celebId, celebName, appeared, authored, professionBooks: initialProfessionBooks, profession, factionGroups: initialFactionGroups, supplementaryDeferred = false, readBooks, id, title }: Props) {
  const t = useTranslations('celebPage')
  const locale = useLocale()
  const tProfession = useTranslations('profession')
  const professionLabel = profession && profession !== 'other' && tProfession.has(profession) ? tProfession(profession) : null
  const professionIntro = professionLabel
    ? t('professionShelfIntro', { profession: professionLabel }) : t('relatedShelfIntro')
  const [professionBooks, setProfessionBooks] = useState(initialProfessionBooks)
  const [factionGroups, setFactionGroups] = useState(initialFactionGroups)
  type LoadState = 'idle' | 'loading' | 'failed' | 'ready'
  const [professionState, setProfessionState] = useState<LoadState>(supplementaryDeferred && profession ? 'idle' : 'ready')
  const [factionState, setFactionState] = useState<LoadState>(supplementaryDeferred ? 'idle' : 'ready')
  const alive = useRef(true)
  const pending = useRef({ profession: false, faction: false })
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const loadProfession = useCallback(() => {
    if (!profession || pending.current.profession) return
    pending.current.profession = true; setProfessionState('loading')
    getProfessionBooks(profession, locale).then(books => {
      if (alive.current) { setProfessionBooks(books); setProfessionState('ready') }
    }).catch(error => { console.error('[CelebBookShelf:profession]', error); if (alive.current) setProfessionState('failed') })
      .finally(() => { pending.current.profession = false })
  }, [profession, locale])
  const loadFactions = useCallback(() => {
    if (pending.current.faction) return
    pending.current.faction = true; setFactionState('loading')
    getCelebFactionBooks(celebId, locale).then(groups => {
      if (alive.current) { setFactionGroups(groups); setFactionState('ready') }
    }).catch(error => { console.error('[CelebBookShelf:faction]', error); if (alive.current) setFactionState('failed') })
      .finally(() => { pending.current.faction = false })
  }, [celebId, locale])
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
    { key: 'profession', context: { personId: celebId, kind: 'profession', showReading }, label: professionLabel ?? t('groupProfession'), intro: professionIntro, books: professionShelfBooks, choices: professionChoices,
      ...(professionState !== 'ready' ? { deferred: { state: professionState, onLoad: loadProfession } } : {}) },
    {
      key: 'faction', context: { personId: celebId, kind: 'affiliation', showReading }, label: t('groupAffiliation'),
      ...(factionState === 'ready' ? { chipLabel: t('affiliationCount', { count: factionGroups.length }) } : {}),
      ...(factionState !== 'ready' ? { deferred: { state: factionState, onLoad: loadFactions } } : {}),
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
