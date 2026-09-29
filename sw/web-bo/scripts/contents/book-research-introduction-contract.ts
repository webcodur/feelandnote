import { isBookIntroductionSource } from '@feelandnote/content-search/book-introduction-contract'
import { mediaIntroductionText } from './media-introduction-contract'
import type { IntroductionChange, IntroductionRow } from './book-description-sources-contract'

/** 허용 출처 어디에도 원문이 없는 BOOK 공란에 에이전트가 조사해 직접 쓴 소개. */
export interface ResearchedBookIntroduction {
  contentId: string
  locale: 'ko' | 'en'
  /** 조사 당시의 표시 제목·저자. 적용 시점에 달라졌으면 다른 책일 수 있어 거절한다. */
  title: string
  creator: string | null
  description: string
  /** 화면 「원문」 링크로 쓰는 대표 근거 문서. */
  sourceUrl: string
  evidence: Array<{ url: string; note: string }>
}

/** 작품 소개 분량 기준(공백 제외 글자 수). 한국어 두 문단 약 250자를 목표로 하고, 영어는 같은 내용의 옮김 분량이다.
 *  이 범위를 벗어나면 다시 쓴다. */
export const RESEARCH_INTRODUCTION_LENGTH = {
  ko: { min: 150, max: 450 },
  en: { min: 350, max: 1400 },
} as const

const blank = (value: string | null) => !value?.trim()

function httpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
  } catch { return false }
}

export function researchIntroductionText(input: ResearchedBookIntroduction): string {
  const text = input.description.replace(/\r\n/g, '\n').trim()
  const length = text.replace(/\s/g, '').length
  const range = RESEARCH_INTRODUCTION_LENGTH[input.locale]
  if (!range || !mediaIntroductionText(text, input.locale) || /<\/?[a-z][^>]*>/i.test(text)
    || length < range.min || length > range.max) {
    throw new Error(`Invalid research introduction: ${input.contentId}`)
  }
  if (!httpsUrl(input.sourceUrl) || !input.evidence?.length
    || input.evidence.some(e => !httpsUrl(e.url) || !e.note?.trim())) throw new Error(`Missing research evidence: ${input.contentId}`)
  return text
}

/** 표시 행과, 같은 ISBN의 빈 판본 행만 채운다. 채워진 행·예약값·제목이 바뀐 행은 건드리지 않는다. */
export function planResearchIntroduction(
  input: ResearchedBookIntroduction,
  locale: IntroductionRow,
  editions: IntroductionRow[],
): IntroductionChange[] {
  const description = researchIntroductionText(input)
  if (locale.content_id !== input.contentId || locale.locale !== input.locale) throw new Error('Research target mismatch')
  if (locale.title !== input.title || locale.creator !== input.creator) throw new Error(`Research identity changed: ${input.contentId}`)
  if (!blank(locale.description) || isBookIntroductionSource(locale.description)) throw new Error(`Introduction is already filled: ${input.contentId}`)
  const rows: Array<[IntroductionChange['table'], IntroductionRow]> = [['content_locales', locale]]
  for (const edition of editions) {
    if (edition.content_id !== input.contentId || edition.locale !== input.locale) continue
    if ((edition.isbn ?? null) !== (locale.isbn ?? null) || !blank(edition.description)) continue
    rows.push(['figure_book_editions', edition])
  }
  return rows.map(([table, before]) => {
    if (before.sources !== null && (typeof before.sources !== 'object' || Array.isArray(before.sources))) throw new Error(`Invalid sources: ${input.contentId}`)
    const sources: Record<string, unknown> = { ...before.sources, description: input.sourceUrl,
      description_method: 'research', description_source_locale: input.locale }
    delete sources.introMissing
    return { table, before, description, sources, verifiedDescription: description }
  })
}
