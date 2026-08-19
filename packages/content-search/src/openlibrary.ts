// OpenLibrary 래퍼 — BOOK 메타의 영문 소개 출처
//
// 카카오는 한국어 소개만 준다. 영문 화면에 실을 소개는 원서 ISBN으로 여기서 받는다.
// 신규 등록 메타는 카카오(한국어판)와 OpenLibrary(영문 원서)만 쓴다 — AGENTS.md 「데이터·외부 서비스」

const OPENLIBRARY_BASE_URL = 'https://openlibrary.org'
const REQUEST_TIMEOUT_MS = 5000

/** description은 문자열로 오기도 하고 {type, value} 객체로 오기도 한다 */
type OpenLibraryDescription = string | { value?: string } | null | undefined

interface OpenLibraryEdition {
  description?: OpenLibraryDescription
  works?: { key: string }[]
}

interface OpenLibraryWork {
  description?: OpenLibraryDescription
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

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${OPENLIBRARY_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

/**
 * ISBN으로 영문 도서 소개를 가져온다.
 *
 * 판(edition)에 소개가 없으면 그 판이 속한 저작(work)의 소개를 쓴다 — 소개는 대개 저작에 달려 있다.
 * 한국어판 ISBN으로는 거의 걸리지 않는다(실측 6.7%). 원서 ISBN을 넣어야 한다.
 */
export async function getBookDescriptionByIsbn(isbn: string): Promise<string | null> {
  const clean = (isbn || '').replace(/[^0-9Xx]/g, '')
  if (!ISBN_PATTERN.test(clean)) return null

  const edition = await fetchJson<OpenLibraryEdition>(`/isbn/${clean}.json`)
  if (!edition) return null

  let description = readDescription(edition.description)

  const workKey = edition.works?.[0]?.key
  if (!description.trim() && workKey) {
    const work = await fetchJson<OpenLibraryWork>(`${workKey}.json`)
    description = readDescription(work?.description)
  }

  const cleaned = cleanDescription(description)
  return cleaned || null
}
