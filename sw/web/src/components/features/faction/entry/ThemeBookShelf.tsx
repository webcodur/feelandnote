'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { getFactionMemberShelf, type FactionMemberShelf } from '@/actions/home/getFactionMemberShelf'
import type { FactionFigureBook } from '@/actions/home/getFactionFigureBooks'
import BookShelf from '@/components/shared/BookShelf/BookShelf'
import { affiliateBookToShelfBook, type BookShelfGroup } from '@/components/shared/BookShelf/types'
import { isThemeBook } from '@/lib/figure-books/themeBooks'
import { isBookShelfAvailable } from '@/lib/books/bookShelf'
import { RetryBlock } from '@/components/ui/pending'

interface Props {
  books: FactionFigureBook[]
  memberIds: string[]
  name: string
  isMyth: boolean
}

/** 신화와 팩션은 모으는 관계만 정하고, 공통 책장이 책을 그린다. */
export default function ThemeBookShelf({ books, memberIds, name, isMyth }: Props) {
  const t = useTranslations(isMyth ? 'explore.hub.myth' : 'explore.faction')
  const tCeleb = useTranslations('celebPage')
  const tProfession = useTranslations('profession')
  const locale = useLocale()
  const [extras, setExtras] = useState<FactionMemberShelf | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const memberKey = memberIds.join(',')
  const shownIdsKey = books.map((book) => book.contentId).join(',')

  useEffect(() => {
    if (!memberKey) return
    let alive = true
    getFactionMemberShelf(memberKey.split(','), shownIdsKey ? shownIdsKey.split(',') : [], locale)
      .then((result) => { if (alive) setExtras(result) })
      .catch((error) => {
        console.error('[ThemeBookShelf]', error)
        if (alive) setFailed(true)
      })
    return () => { alive = false }
  }, [memberKey, shownIdsKey, locale, attempt])

  const memberSet = new Set(memberIds)
  const available = books.filter(isBookShelfAvailable)
  const own = available.filter((book) => isThemeBook(book, name, isMyth))
  const ownIds = new Set(own.map((book) => book.contentId))
  const appeared = available.filter((book) => !ownIds.has(book.contentId) && book.appearedIds.some((id) => memberSet.has(id)))
  const authored = available.filter((book) => book.authoredIds.some((id) => memberSet.has(id)))
  const profession = extras?.profession
  const professionIntro = profession && profession !== 'other' && tProfession.has(profession)
    ? t('worksProfessionLead', { profession: tProfession(profession) }) : tCeleb('relatedShelfIntro')
  const groups: BookShelfGroup[] = [
    { key: 'theme', context: { memberIds, kind: 'theme' }, label: tCeleb('groupTheme'), intro: t(isMyth ? 'worksLeadOwn' : 'worksThemeLead'), listSubtitle: name, books: own.map(affiliateBookToShelfBook) },
    { key: 'appeared', context: { memberIds, kind: 'appeared' }, label: tCeleb('groupAppeared'), intro: t(isMyth ? 'worksLeadOthers' : 'worksAppearedLead'), books: appeared.map(affiliateBookToShelfBook) },
    { key: 'read', context: { memberIds, kind: 'read' }, label: tCeleb('groupRead'), intro: t('worksReadLead'), books: (extras?.read ?? []).map(affiliateBookToShelfBook) },
    { key: 'authored', context: { memberIds, kind: 'authored' }, label: tCeleb('groupAuthored'), intro: t('worksAuthoredLead'), books: authored.map(affiliateBookToShelfBook) },
    { key: 'profession', context: { kind: 'profession' }, label: tCeleb('groupProfession'), intro: professionIntro,
      books: (extras?.professionBooks ?? []).map(affiliateBookToShelfBook) },
  ]
  return (
    <>
      {failed && <RetryBlock onRetry={() => { setFailed(false); setAttempt((value) => value + 1) }} />}
      {/* 카드 안 제목은 두지 않는다 — 바깥 구획 머리(HubSection)가 같은 이름을 쥔다 */}
      <BookShelf groups={groups} ariaLabel={t('worksTitle')} />
    </>
  )
}
