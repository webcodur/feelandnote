/**
 * i18n — hardcoded UI string translations for BookRecommend compositions
 */
import type { BookRecommendScript } from './types'

interface Strings {
  libraryTour: string
  tagline: string
  ctaText: string
  ctaDefault: string
  nBooks: (n: number) => string
  headerTitle: (title: string, nickname: string) => string
  brandSubtitle: (nickname: string, n: number) => string
  brandCount: (n: number) => string
  labelTitle: string
  labelSummary: string
  labelContext: string
  publishYear: (year: string) => string
  categoryLabel: Record<string, string>
  partLabel: (part: number, total: number) => string
  bookCounter: (current: number, total: number) => string
  // 섹션 명칭 (Breadcrumb용)
  secOpening: string
  secGreeting: string
  secIntro: string
  secFeaturedQuote: string
  secReturn: string
  secPrevRecap: string
  secCelebIntro: string
  secPhilosophy: string
  secBridge: string
  secMidRecap: string
  secInterlude: string
  secRecap: string
  secOutro: string
  secEnding: string
}

const strings: Record<'ko' | 'en', Strings> = {
  ko: {
    libraryTour: '서재 탐방',
    tagline: '한 줄의 기록, 천 년의 울림',
    ctaText: 'feelandnote.com',
    ctaDefault: '전체 영상은 하단의 [서재탐방]에서 만나보세요',
    nBooks: (n: number) => `${n}권의 책`,
    headerTitle: (title: string, nickname: string) => `${title} ${nickname}의 서재`,
    brandSubtitle: (nickname: string) => `${nickname}의 서재를 함께한`,
    brandCount: (n: number) => `${n}권의 책`,
    labelTitle: '제목',
    labelSummary: '핵심 요약',
    labelContext: '감상 배경',
    publishYear: (year: string) => year.includes('세기') || year.includes('년') ? year : `${year}년 집필`,
    categoryLabel: { BOOK: '도서', VIDEO: '영상', GAME: '게임', MUSIC: '음악' },
    partLabel: (part: number, total: number) => `${part}/${total}편`,
    bookCounter: (current: number, total: number) => `${current}/${total}권`,
    secOpening: '오프닝',
    secGreeting: '인사',
    secIntro: '소개',
    secFeaturedQuote: '대표 명언',
    secReturn: '복귀 인사',
    secPrevRecap: '이전 회차',
    secCelebIntro: '인물 소개',
    secPhilosophy: '감상 철학',
    secBridge: '전환',
    secMidRecap: '중간 정리',
    secInterlude: '후반부',
    secRecap: '정리',
    secOutro: '마무리',
    secEnding: '엔딩',
  },
  en: {
    libraryTour: 'Library Tour',
    tagline: 'A Single Line Recorded,\nA Thousand Years of Echoes',
    ctaText: 'feelandnote.com',
    ctaDefault: 'Full video below [Library Tour] Watch now',
    nBooks: (n: number) => `${n} Books`,
    headerTitle: (title: string, nickname: string) => `${title} ${nickname}'s Library`,
    brandSubtitle: (nickname: string) => `Exploring ${nickname}'s Library`,
    brandCount: (n: number) => `${n} Books`,
    labelTitle: 'Title',
    labelSummary: 'Summary',
    labelContext: 'Context',
    publishYear: (year: string) => year,
    categoryLabel: { BOOK: 'Book', VIDEO: 'Film', GAME: 'Game', MUSIC: 'Music' },
    partLabel: (part: number, total: number) => `Part ${part}/${total}`,
    bookCounter: (current: number, total: number) => `${current}/${total}`,
    secOpening: 'Opening',
    secGreeting: 'Greeting',
    secIntro: 'Introduction',
    secFeaturedQuote: 'Featured Quote',
    secReturn: 'Return',
    secPrevRecap: 'Previously',
    secCelebIntro: 'Profile',
    secPhilosophy: 'Philosophy',
    secBridge: 'Transition',
    secMidRecap: 'Mid Recap',
    secInterlude: 'Part II',
    secRecap: 'Recap',
    secOutro: 'Outro',
    secEnding: 'Ending',
  },
}

export function t(script: BookRecommendScript): Strings {
  return strings[script.locale === 'en' ? 'en' : 'ko']
}
