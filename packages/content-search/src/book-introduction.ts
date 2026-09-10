import {
  fetchDaumBookDescription,
  getDaumMobileDetailUrl,
  getKakaoBookByIsbn,
  toIsbn13,
} from '@feelandnote/content-search/kakao-books'
import { getOpenLibraryBookIntroduction, getOpenLibraryBookUrl } from '@feelandnote/content-search/openlibrary'
import { BOOK_INTRODUCTION_SOURCE_WRITES_ENABLED, isBookIntroductionSource, type BookIntroductionSource } from '@feelandnote/content-search/book-introduction-contract'

export interface BookIntroduction {
  source: BookIntroductionSource | null
  sourceUrl: string | null
  description: string | null
}

const EMPTY: BookIntroduction = { source: null, sourceUrl: null, description: null }

/** 기존 운영 웹과 DB를 함께 쓰는 동안 신규 예약값 저장은 보류한다. */
export async function fetchBookIntroductionForStorage(input: Parameters<typeof fetchBookIntroduction>[0]): Promise<BookIntroduction> {
  return BOOK_INTRODUCTION_SOURCE_WRITES_ENABLED ? fetchBookIntroduction(input) : { ...EMPTY }
}

function forLocale(description: string | null | undefined, locale: 'ko' | 'en', confirmedEnglish = false): string | null {
  const text = description?.trim()
  if (!text) return null
  const hangul = text.match(/\p{Script=Hangul}/gu)?.length ?? 0
  const latin = text.match(/\p{Script=Latin}/gu)?.length ?? 0
  // 서명·인용 한두 단어가 아니라 본문의 주 언어를 확인한다.
  if (locale === 'ko') return hangul > 0 && hangul >= latin ? text : null
  if (hangul > 0 || !latin || /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Cyrillic}\p{Script=Arabic}]/u.test(text)) return null
  // 라틴 문자만으로 프랑스어·스페인어 등을 영어라고 판단하지 않는다.
  const englishWords = new Set(text.toLowerCase().match(/\b(?:the|and|of|to|is|are|was|were|with|for|from|this|that|his|her|its|book|novel|story)\b/g) ?? [])
  if (!confirmedEnglish && englishWords.size < 2) return null
  return text
}

function kakaoSourceUrl(isbn: string): string {
  return `https://dapi.kakao.com/v3/search/book?target=isbn&query=${isbn}`
}

function isbnFromKakaoUrl(raw: string): string | null {
  const url = new URL(raw)
  if (url.origin !== 'https://dapi.kakao.com' || url.username || url.password || url.port
    || url.pathname !== '/v3/search/book' || url.searchParams.get('target') !== 'isbn') {
    throw new Error('Invalid Kakao book URL')
  }
  return toIsbn13(url.searchParams.get('query') ?? '')
}

/** 최초에는 유효한 소개를 골라 출처를 반환하고, 출처가 있으면 그곳만 다시 조회한다. */
export async function fetchBookIntroduction(input: {
  isbn?: string | null
  locale: 'ko' | 'en'
  source?: BookIntroductionSource | null
  sourceUrl?: string | null
}): Promise<BookIntroduction> {
  const { source, locale } = input
  if (source != null && !isBookIntroductionSource(source)) throw new Error('Invalid book introduction source')
  if (locale !== 'ko' && locale !== 'en') throw new Error('Invalid book introduction locale')
  if ((locale === 'ko' && source === 'OPEN') || (locale === 'en' && source && source !== 'OPEN')) {
    return { source, sourceUrl: null, description: null }
  }

  if (locale === 'en') {
    const sourceUrl = input.sourceUrl && getOpenLibraryBookUrl(input.sourceUrl)
    if (input.sourceUrl && !sourceUrl) throw new Error('Invalid OpenLibrary book URL')
    const isbn = toIsbn13(input.isbn ?? '')
    if (isbn && sourceUrl && new URL(sourceUrl).pathname.startsWith('/isbn/')) {
      const urlIsbn = toIsbn13(new URL(sourceUrl).pathname.slice('/isbn/'.length))
      if (urlIsbn !== isbn) throw new Error('OpenLibrary source ISBN does not match the selected book')
    }
    const result = await getOpenLibraryBookIntroduction({ isbn: input.isbn, sourceUrl: sourceUrl || null })
    const confirmedEnglish = result?.languages.includes('/languages/eng') ?? false
    const english = !result?.languages.length || confirmedEnglish
    const description = english ? forLocale(result?.description, 'en', confirmedEnglish) : null
    if (!description && !source) return { ...EMPTY }
    return { source: 'OPEN', sourceUrl: result?.sourceUrl ?? sourceUrl ?? null, description }
  }

  let isbn = toIsbn13(input.isbn ?? '')
  if (source === 'KAKAO' && input.sourceUrl) {
    const sourceIsbn = isbnFromKakaoUrl(input.sourceUrl)
    if (isbn && sourceIsbn !== isbn) throw new Error('Kakao source ISBN does not match the selected book')
    isbn = isbn ?? sourceIsbn
  }
  if (source === 'DAUM' && input.sourceUrl) {
    const sourceUrl = getDaumMobileDetailUrl(input.sourceUrl)
    if (!sourceUrl) throw new Error('Invalid Daum book URL')
    const urlIsbn = toIsbn13(new URL(sourceUrl).searchParams.get('q') ?? '')
    if (isbn && urlIsbn && isbn !== urlIsbn) throw new Error('Daum source ISBN does not match the selected book')
    return { source, sourceUrl, description: forLocale(await fetchDaumBookDescription(sourceUrl), locale) }
  }
  if (!isbn) return { ...EMPTY, source: source ?? null }

  const book = await getKakaoBookByIsbn(isbn)
  if (!book) return { source: source ?? null, sourceUrl: source === 'KAKAO' ? kakaoSourceUrl(isbn) : null, description: null }
  const kakaoDescription = forLocale(book.metadata.description, locale)
  const kakao: BookIntroduction = { source: 'KAKAO', sourceUrl: kakaoSourceUrl(isbn), description: kakaoDescription }
  if (source === 'KAKAO') return kakao

  const sourceUrl = getDaumMobileDetailUrl(book.metadata.link)
  let daumDescription: string | null = null
  if (sourceUrl) {
    try {
      daumDescription = forLocale(await fetchDaumBookDescription(sourceUrl), locale)
    } catch (error) {
      if (source === 'DAUM' || !kakaoDescription) throw error
    }
  }
  if (source === 'DAUM') return { source, sourceUrl, description: daumDescription }
  if (daumDescription && daumDescription.length > (kakaoDescription?.length ?? 0)) {
    return { source: 'DAUM', sourceUrl, description: daumDescription }
  }
  return kakaoDescription ? kakao : { ...EMPTY }
}
