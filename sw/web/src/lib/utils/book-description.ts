import {
  isBookIntroductionSource,
  type BookIntroductionSource,
} from '@feelandnote/content-search/book-introduction-contract'
import { pickIntroForLocale } from './content-locale-text'

export interface BookIntroductionReference {
  isbn: string | null
  source: BookIntroductionSource
  sourceUrl: string | null
}

interface StoredBookIntroduction {
  locale: string
  isbn?: string | null
  description?: string | null
  sources?: unknown
}

export interface BookIntroductionDisplay {
  description: string | null
  bookIntroduction: BookIntroductionReference | null
}

export function bookIntroductionSourceUrl(sources: unknown): string | null {
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) return null
  const url = (sources as Record<string, unknown>).description
  return typeof url === 'string' && /^https:\/\//.test(url) ? url : null
}

/** 예약값은 표시문으로 내보내지 않는다. 전환 전 NULL은 기존 외부 조회를 유지하되 DB에 선정값을 쓰지 않는다. */
export function bookIntroductionDisplay(
  locale: string,
  row: StoredBookIntroduction | null | undefined,
): BookIntroductionDisplay {
  const empty = { description: null, bookIntroduction: null }
  if (!row || row.locale !== locale) return empty
  if (!row.description) return empty
  if (isBookIntroductionSource(row.description)) {
    const source = row.description
    if ((locale === 'en') !== (source === 'OPEN')) return empty
    return {
      description: null,
      bookIntroduction: {
        isbn: normalizeBookIsbn(row.isbn),
        source,
        sourceUrl: bookIntroductionSourceUrl(row.sources),
      },
    }
  }
  return { description: pickIntroForLocale(locale, [row.description]), bookIntroduction: null }
}

function comparableIsbn(value: string | null | undefined): string | null {
  const isbn = normalizeBookIsbn(value)
  if (!isbn || isbn.length === 13) return isbn
  const base = `978${isbn.slice(0, 9)}`
  const sum = [...base].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0)
  return `${base}${(10 - sum % 10) % 10}`
}

/** 판본 값 우선. 작품 locale은 같은 언어·같은 ISBN일 때만 보완한다. */
export function selectBookIntroduction(
  locale: string,
  edition: StoredBookIntroduction | null | undefined,
  localeRow: StoredBookIntroduction | null | undefined,
): BookIntroductionDisplay {
  if (!edition) return bookIntroductionDisplay(locale, localeRow)
  if (edition.locale !== locale) return { description: null, bookIntroduction: null }
  if (edition.description && !isBookIntroductionSource(edition.description)) return bookIntroductionDisplay(locale, edition)
  const isbn = comparableIsbn(edition.isbn)
  const matchingLocale = isbn && isbn === comparableIsbn(localeRow?.isbn) && localeRow?.locale === locale ? localeRow : null
  // 같은 판본의 저장 번역문을 예약값으로 가리지 않는다.
  if (matchingLocale?.description && !isBookIntroductionSource(matchingLocale.description)) {
    return bookIntroductionDisplay(locale, matchingLocale)
  }
  if (edition.description && matchingLocale?.description === edition.description
    && !bookIntroductionSourceUrl(edition.sources)) {
    return bookIntroductionDisplay(locale, { ...edition, sources: matchingLocale.sources })
  }
  return bookIntroductionDisplay(locale, edition.description ? edition : matchingLocale ?? edition)
}

export function normalizeBookIsbn(value: string | null | undefined): string | null {
  const isbn = value?.replace(/[\s-]/g, '') ?? ''
  return /^(?:\d{13}|\d{9}[\dXx])$/.test(isbn) ? isbn.toUpperCase() : null
}

// 선택 판본 → 요청 언어의 판본 → 한국어 대표 ISBN 순서. 영문에 한국어 대표 ISBN을 쓰지 않는다.
export function resolveBookIsbn(
  locale: string,
  editionIsbn: string | null | undefined,
  localeIsbn: string | null | undefined,
  externalId?: string | null,
): string | null {
  return normalizeBookIsbn(editionIsbn) ?? normalizeBookIsbn(localeIsbn)
    ?? (locale === 'ko' ? normalizeBookIsbn(externalId) : null)
}
