/**
 * i18n — hardcoded UI string translations for BookRecommend compositions
 */
import type { BookRecommendScript } from './types'

interface Strings {
  libraryTour: string
  tagline: string
  ctaText: string
  nBooks: (n: number) => string
  headerTitle: (nickname: string, n: number) => { line1: string; line2: string }
  brandSubtitle: (nickname: string, n: number) => string
  brandCount: (n: number) => string
  labelSummary: string
  labelContext: string
  publishYear: (year: string) => string
}

const strings: Record<'ko' | 'en', Strings> = {
  ko: {
    libraryTour: '서재 탐방',
    tagline: '한 줄의 기록, 천 년의 울림',
    ctaText: '더 많은 서재 탐방은 프로필에서',
    nBooks: (n: number) => `${n}권의 책`,
    headerTitle: (nickname: string, n: number) => {
      // Korean particle 가/이 based on final consonant
      const last = nickname.slice(-1)
      const code = last.charCodeAt(0)
      const hasBatchim = code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 > 0
      const particle = hasBatchim ? '이' : '가'
      return { line1: `${nickname}${particle} 감상한`, line2: `${n}권의 책` }
    },
    brandSubtitle: (nickname: string) => `${nickname}의 서재를 함께한`,
    brandCount: (n: number) => `${n}권의 책`,
    labelSummary: '핵심 요약',
    labelContext: '추천 및 감상경위',
    publishYear: (year: string) => year.startsWith('기원전') ? year : `${year}년 집필`,
  },
  en: {
    libraryTour: 'Library Tour',
    tagline: 'One Line of Record, A Millennium of Echoes',
    ctaText: 'More library tours on our profile',
    nBooks: (n: number) => `${n} Books`,
    headerTitle: (nickname: string, n: number) => ({
      line1: `${nickname}'s`,
      line2: `${n} Books`,
    }),
    brandSubtitle: (nickname: string) => `Exploring ${nickname}'s Library`,
    brandCount: (n: number) => `${n} Books`,
    labelSummary: 'Summary',
    labelContext: 'Context & Recommendation',
    publishYear: (year: string) => year,
  },
}

type Locale = 'ko' | 'en'

export function getLocale(script: BookRecommendScript): Locale {
  return script.locale === 'en' ? 'en' : 'ko'
}

export function t(script: BookRecommendScript): Strings {
  return strings[getLocale(script)]
}
