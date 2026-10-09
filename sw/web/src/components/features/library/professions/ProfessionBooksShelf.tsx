'use client'

import { useTranslations } from 'next-intl'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import BookShelf from '@/components/shared/BookShelf/BookShelf'
import { affiliateBookToShelfBook } from '@/components/shared/BookShelf/types'
import { getProfessionShelfChoices } from '@/lib/books/professionShelf'

// 인물 책장의 직업 훈련·수업·탐구와 같은 분류, 선정 이유, 판본 선택을 제공한다.
export default function ProfessionBooksShelf({ books, profession }: { books: AffiliateBook[]; profession: string }) {
  const t = useTranslations('celebPage')
  const choices = getProfessionShelfChoices(books.map(affiliateBookToShelfBook), {
    train: t('professionTrain'), become: t('professionBecome'), about: t('professionAbout'),
    trainIntro: t('professionTrainIntro'),
    becomeIntro: t('professionBecomeIntro'), aboutIntro: t('professionAboutIntro'),
  })
  return <BookShelf key={profession} ariaLabel={t('groupProfession')} groups={choices.map((choice) => ({
    ...choice, context: { kind: 'profession' as const },
    listSubtitle: `${profession} · ${choice.label}: ${choice.intro}`,
  }))} />
}
