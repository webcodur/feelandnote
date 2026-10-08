// OpenLibrary 래퍼 — BOOK 메타의 영문 소개 출처
//
// 카카오는 한국어 소개만 준다. 영문 화면에 실을 소개는 원서 ISBN으로 여기서 받는다.
// 신규 등록 메타는 카카오(한국어판)와 OpenLibrary(영문 원서)만 쓴다 — AGENTS.md 「데이터·외부 서비스」

import { toIsbn13 } from './book-isbn'
import { getBookOriginalAuthorKeys, canUseBookWorkIntroduction } from './book-original-authors'
import { OPENLIBRARY_BASE_URL, OPENLIBRARY_REQUEST_TIMEOUT_MS as REQUEST_TIMEOUT_MS, requestOpenLibrary } from './openlibrary-request'

export const OPENLIBRARY_BOOK_BATCH_SIZE = 100

/** 공식 Books API의 다중 ISBN 조회. 재시도·누락 판정은 감사 호출자가 처리한다. */
export async function requestOpenLibraryBookBatch(isbns: string[], command: 'data' | 'details'): Promise<Response> {
  if (!isbns.length || isbns.length > OPENLIBRARY_BOOK_BATCH_SIZE || isbns.some(isbn => toIsbn13(isbn) !== isbn)) {
    throw new Error('Invalid OpenLibrary ISBN batch')
  }
  const params = new URLSearchParams({ bibkeys: isbns.map(isbn => `ISBN:${isbn}`).join(','), jscmd: command, format: 'json' })
  return requestOpenLibrary(`${OPENLIBRARY_BASE_URL}/api/books?${params}`, 'error', 60000)
}


/** description은 문자열로 오기도 하고 {type, value} 객체로 오기도 한다 */
type OpenLibraryDescription = string | { value?: string } | null | undefined

interface OpenLibraryEdition {
  key?: string
  title?: string
  subtitle?: string
  isbn_10?: string[]
  isbn_13?: string[]
  publishers?: string[]
  publish_date?: string
  physical_format?: string
  authors?: { key: string }[]
  covers?: number[]
  description?: OpenLibraryDescription
  works?: { key: string }[]
  languages?: { key: string }[]
  contributions?: string[]
  by_statement?: string
}

interface OpenLibraryWork {
  title?: string
  authors?: { author?: { key: string } }[]
  description?: OpenLibraryDescription
  languages?: { key: string }[]
}

export interface OpenLibraryBookMetadata {
  isbn: string
  title: string
  creator: string
  publisher: string
  publishDate: string | null
  coverImageUrl: string | null
  sourceUrl: string
  workKey: string | null
  workTitle?: string | null
  languages: string[]
  physicalFormat?: string | null
  translators?: string[]
}

/** 원저자 목록과 구분된 공식 판본의 번역 기여자만 읽는다. */
export function getOpenLibraryTranslatorNames(details: { contributions?: unknown; by_statement?: unknown }): string[] {
  const roles = Array.isArray(details.contributions) ? details.contributions.filter((value): value is string => typeof value === 'string') : []
  const names = roles.flatMap(value => {
    const match = value.match(/^(.+?)\s*\((?:translat(?:or|ed)|translation)[^)]*\)$/iu)
      ?? value.match(/^(.+?),\s*translat(?:or|ed)$/iu)
    return match ? [match[1].trim()] : []
  })
  if (!names.length && typeof details.by_statement === 'string') {
    const match = details.by_statement.match(/\btranslat(?:ed|ion)\b[^;]*?\bby\s+([^;]+)(?:;|$)/iu)
    if (match && match[1].length < 100) names.push(match[1].trim().replace(/[.]$/u, ''))
  }
  return [...new Set(names)]
}

/** 판본 언어는 판본 응답으로 확인한다. 국가군과 원전 언어는 번역판 언어의 근거가 아니다. */
export async function getOpenLibraryBookMetadata(
  rawIsbn: string,
  options: { allowMissingPublisher?: boolean } = {},
): Promise<OpenLibraryBookMetadata | null> {
  const isbn = toIsbn13(rawIsbn)
  if (!isbn) return null
  const result = await fetchJson<OpenLibraryEdition>(`${OPENLIBRARY_BASE_URL}/isbn/${isbn}`)
  if (!result) return null
  const edition = result.data
  if (!/^\/books\/OL\d+M$/.test(edition.key ?? '')) throw new Error(`${isbn}: OpenLibrary 판본 ID를 확인할 수 없습니다`)
  const returnedIsbns = [...(edition.isbn_13 ?? []), ...(edition.isbn_10 ?? [])].map(toIsbn13).filter(Boolean)
  if (!returnedIsbns.includes(isbn)) throw new Error(`${isbn}: OpenLibrary 응답 ISBN이 다른 판본입니다`)
  const languages = (edition.languages ?? []).map(item => item.key)
  if (!languages.includes('/languages/eng')) throw new Error(`${isbn}: OpenLibrary 판본의 영어를 확인할 수 없습니다`)
  const mainTitle = edition.title?.trim() ?? ''
  const subtitle = edition.subtitle?.trim() ?? ''
  const title = subtitle && !mainTitle.toLowerCase().includes(subtitle.toLowerCase()) ? `${mainTitle}: ${subtitle}` : mainTitle
  const publisher = (edition.publishers ?? []).map(value => value.trim()).filter(Boolean).join(', ')
  // 출판사 누락을 NULL로 보존하는 등록 경로만 이 예외를 명시한다.
  if (!mainTitle || (!publisher && !options.allowMissingPublisher)) {
    throw new Error(`${isbn}: OpenLibrary 판본의 제목 또는 출판사가 없습니다`)
  }
  const workKey = edition.works?.find(item => /^\/works\/OL\d+W$/.test(item.key))?.key ?? null
  const work = workKey ? await fetchJson<OpenLibraryWork>(`${OPENLIBRARY_BASE_URL}${workKey}`) : null
  const workAuthors = (work?.data.authors ?? []).flatMap(item => item.author?.key ? [item.author.key] : [])
  const editionAuthors = (edition.authors ?? []).map(item => item.key)
  const authorKeys = getBookOriginalAuthorKeys(editionAuthors, workAuthors)
  if (!authorKeys) {
    // 다른 판의 낭독자·편집자가 연결 원전의 author 목록에 섞인 실제 응답이 있다.
    // 판본에 없는 인물을 원저자로 추가하거나, 확인되지 않은 공저자를 임의로 빼지 않는다.
    throw new Error(`${isbn}: OpenLibrary 원전의 저자 목록을 판본에서 확인할 수 없어 작품 연결을 확인해야 합니다`)
  }
  // 연결 원전의 저자를 써서 판본의 번역자·서문 저자를 원저자로 섞지 않는다.
  const names: string[] = []
  for (const key of [...new Set(authorKeys)]) {
    if (!/^\/authors\/OL\d+A$/.test(key)) throw new Error(`${isbn}: OpenLibrary 저자 ID가 잘못됐습니다`)
    const response = await requestOpenLibrary(`${OPENLIBRARY_BASE_URL}${key}.json`, 'error')
    if (!response.ok) throw new Error(`OpenLibrary author API 오류: ${response.status}`)
    const author = await response.json() as { name?: string }
    if (!author.name?.trim()) throw new Error(`${isbn}: OpenLibrary 원저자 이름이 없습니다`)
    names.push(author.name.trim())
  }
  if (!names.length) throw new Error(`${isbn}: OpenLibrary 원저자를 확인할 수 없습니다`)
  const cover = edition.covers?.find(value => Number.isInteger(value) && value > 0)
  // 같은 ISBN의 중복 판본 중에는 covers가 없지만 ISBN 표지 조회는 가능한 레코드가 있다.
  let coverImageUrl: string | null = cover
    ? `https://covers.openlibrary.org/b/id/${cover}-L.jpg`
    : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  if (coverImageUrl) {
    try {
      const response = await fetch(`${coverImageUrl}?default=false`, {
        method: 'HEAD', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), redirect: 'follow',
      })
      if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('image/')) coverImageUrl = null
    } catch {
      // 표지 서버의 리다이렉트·접속 실패는 이미 확인한 ISBN·원저자·언어를 무효로 만들지 않는다.
      coverImageUrl = null
    }
  }
  return {
    isbn, title, creator: names.join(', '), publisher,
    publishDate: edition.publish_date ?? null, coverImageUrl,
    sourceUrl: `${OPENLIBRARY_BASE_URL}${edition.key}`, workKey, workTitle: work?.data.title?.trim() || null, languages,
    physicalFormat: typeof edition.physical_format === 'string' ? edition.physical_format : null,
    translators: getOpenLibraryTranslatorNames(edition),
  }
}

export interface OpenLibraryBookIntroduction {
  description: string | null
  sourceUrl: string
  languages: string[]
}

const ISBN_PATTERN = /^(\d{9}[\dXx]|\d{13})$/

function readDescription(value: OpenLibraryDescription): string {
  if (typeof value === 'string') return value
  return value?.value ?? ''
}

/*
  편집자가 붙인 출처 꼬리표와 마크다운 표기를 떼어 낸다.
  본문 뒤에 "([source][1])"와 링크 각주가 딸려 오는 판이 많고, 부제를 별표로 감싼 판도 흔하다.
  화면은 이 값을 일반 텍스트로 뿌리므로 표기가 남으면 별표와 대괄호가 그대로 보인다.
*/
function cleanDescription(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*-{3,}\s*$[\s\S]*/m, '')
    .replace(/\n\s*\[\d+\]:\s*\S+.*$/gm, '')
    .replace(/\(\[[^\]]*\]\[\d+\]\)/g, '')
    .replace(/\[([^\]]+)\]\[\d+\]/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(?<![\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![\w*])/g, '$1')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function getOpenLibraryBookUrl(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (url.origin !== OPENLIBRARY_BASE_URL || url.username || url.password || url.port) return null
    let path = url.pathname.replace(/\.json$/, '')
    if (/^\/isbn\/[^/]+$/.test(path)) {
      const isbn = path.slice('/isbn/'.length)
      if (!toIsbn13(isbn)) return null
    } else {
      // 공식 책 페이지의 제목 경로도 같은 레코드다. 조회는 제목이 없는 정본 JSON 주소로 한다.
      const record = /^\/(books\/OL\d+M|works\/OL\d+W)(?:\/[^/]+)?$/.exec(path)
      if (!record) return null
      path = `/${record[1]}`
    }
    return `${OPENLIBRARY_BASE_URL}${path}`
  } catch {
    return null
  }
}

async function fetchJson<T>(sourceUrl: string): Promise<{ data: T; sourceUrl: string } | null> {
  const initialUrl = getOpenLibraryBookUrl(sourceUrl)
  if (!initialUrl) throw new Error('Invalid OpenLibrary book URL')
  let currentUrl: string = initialUrl
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response: Response = await requestOpenLibrary(`${currentUrl}.json`)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location: string | null = response.headers.get('location')
      const nextUrl: string | null = location ? getOpenLibraryBookUrl(new URL(location, currentUrl).toString()) : null
      if (!nextUrl) throw new Error('Invalid OpenLibrary redirect')
      currentUrl = nextUrl
      continue
    }
    if (response.status === 404) return null
    // 장애를 소개 없음으로 캐시하지 않도록 호출자가 실패와 정상적인 누락을 구별한다.
    if (!response.ok) throw new Error(`OpenLibrary API 오류: ${response.status}`)
    return { data: (await response.json()) as T, sourceUrl: currentUrl }
  }
  throw new Error('Too many OpenLibrary redirects')
}

/** ISBN 또는 이전에 확인한 OpenLibrary 주소에서 소개와 실제 조회 주소를 함께 받는다. */
export async function getOpenLibraryBookIntroduction(input: {
  isbn?: string | null
  sourceUrl?: string | null
}): Promise<OpenLibraryBookIntroduction | null> {
  const cleanIsbn = (input.isbn || '').replace(/[\s-]/g, '').toUpperCase()
  const sourceUrl = input.sourceUrl ?? (toIsbn13(cleanIsbn) ? `${OPENLIBRARY_BASE_URL}/isbn/${cleanIsbn}` : null)
  if (!sourceUrl) return null
  const edition = await fetchJson<OpenLibraryEdition>(sourceUrl)
  if (!edition) return null

  let description = cleanDescription(readDescription(edition.data.description))
  let descriptionUrl = edition.sourceUrl
  const languages = edition.data.languages ?? []
  const workKey = edition.data.works?.[0]?.key
  if (!description && workKey) {
    const work = await fetchJson<OpenLibraryWork>(`${OPENLIBRARY_BASE_URL}${workKey}`)
    const editionTitle = [edition.data.title, edition.data.subtitle].filter(Boolean).join(': ')
    const editionAuthors = (edition.data.authors ?? []).map(author => author.key)
    const workAuthors = (work?.data.authors ?? []).map(author => author.author?.key).filter((key): key is string => Boolean(key))
    if (work && canUseBookWorkIntroduction(editionTitle, editionAuthors, work.data.title, workAuthors)) {
      description = cleanDescription(readDescription(work.data.description))
      descriptionUrl = work.sourceUrl
    }
  }
  return { description: description || null, sourceUrl: descriptionUrl, languages: languages.map(item => item.key) }
}

/**
 * ISBN으로 영문 도서 소개를 가져온다.
 *
 * 판(edition)에 소개가 없으면 원제·원저자가 일치하는 저작(work)의 소개만 쓴다.
 * 한국어판 ISBN으로는 거의 걸리지 않는다(실측 6.7%). 원서 ISBN을 넣어야 한다.
 */
export async function getBookDescriptionByIsbn(isbn: string): Promise<string | null> {
  const clean = (isbn || '').replace(/[^0-9Xx]/g, '')
  if (!ISBN_PATTERN.test(clean)) return null

  return (await getOpenLibraryBookIntroduction({ isbn: clean }))?.description ?? null
}
