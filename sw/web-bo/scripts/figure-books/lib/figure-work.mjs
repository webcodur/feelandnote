/**
 * 인물 도서 작품·판본 작업의 공통 도구.
 * 작품 정체성 규칙, 결정적 content_id, 책 정보 조회(카카오·OpenLibrary·위키데이터), DB 페이징을 한곳에 둔다.
 *
 * 작품 정체성(workIdentity) 우선순위
 *   1. wikidata:q<id>           위키데이터에 저작 항목이 있으면
 *   2. <원저자>/<원제> 슬러그    원서가 확인된 번역서
 *   3. book/<ko-isbn>           원서가 없는 국내서 — 판본이 곧 작품
 * content_id는 어느 규칙이든 `fiction-source-work:<identity>`의 UUID v5다. figure-books:book과 같다.
 */

import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const PAGE_SIZE = 1000
export const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book'
export const OPENLIBRARY_URL = 'https://openlibrary.org'
export const WDQS_URL = 'https://query.wikidata.org/sparql'
const USER_AGENT = 'feelandnote-figure-books/1.0 (https://feelandnote.com)'

export function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

export function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

export function dbClient() {
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.DB_SECRET_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY가 필요합니다.')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function allRows(label, page) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`${label} 조회 실패: ${error.message}`)
    const current = data ?? []
    rows.push(...current)
    if (current.length < PAGE_SIZE) return rows
  }
}

export async function inChunks(ids, size, run) {
  const out = []
  for (let index = 0; index < ids.length; index += size) {
    const { data, error } = await run(ids.slice(index, index + size))
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
  }
  return out
}

// ── 정규화 ────────────────────────────────────────────────────────────────

export const bareIsbn = (value) => String(value ?? '').replace(/[^0-9Xx]/g, '')

/** ISBN10을 ISBN13(978 접두)으로 바꾼다. 카카오·판본 표는 13자리만 쓴다. 형식이 아니면 null. */
export function isbn10to13(value) {
  const digits = bareIsbn(value).toUpperCase()
  if (digits.length !== 10) return null
  const body = `978${digits.slice(0, 9)}`
  const sum = [...body].reduce((acc, ch, i) => acc + Number(ch) * (i % 2 ? 3 : 1), 0)
  return `${body}${(10 - (sum % 10)) % 10}`
}

export function squash(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\((.*?)\)/g, ' ')
    .replace(/[\s·:;,.!?'"`~「」『』<>\-–—_/\\[\]{}]/g, '')
}

/** 라틴 문자 슬러그. 악센트를 벗기고 영숫자·하이픈만 남긴다. 비라틴 문자열이면 빈 문자열이다. */
export function slug(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function deterministicContentId(identity) {
  const namespace = Buffer.from('9a1debef9d5f5d9a82918e8ef3822e97', 'hex')
  const digest = createHash('sha1').update(namespace).update(`fiction-source-work:${identity}`, 'utf8').digest().subarray(0, 16)
  digest[6] = (digest[6] & 0x0f) | 0x50
  digest[8] = (digest[8] & 0x3f) | 0x80
  const hex = digest.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const wikidataIdentity = (qid) => `wikidata:${String(qid).toLowerCase()}`

/** 원저자·원제 슬러그 정체성. 어느 한쪽이 비라틴이라 슬러그가 비면 대체 키를 쓴다. */
export function originalIdentity(author, title, fallback) {
  const a = slug(author)
  const t = slug(title)
  if (a && t) return `${a}/${t}`
  return fallback
}

// ── 책 정보 조회 ───────────────────────────────────────────────────────────

export async function kakaoByIsbn(isbn) {
  const key = process.env.KAKAO_REST_API_KEY
  if (!key) throw new Error('KAKAO_REST_API_KEY가 필요합니다.')
  const params = new URLSearchParams({ query: isbn, size: '3', target: 'isbn' })
  const response = await fetch(`${KAKAO_URL}?${params}`, { headers: { Authorization: `KakaoAK ${key}` } })
  if (!response.ok) return null
  const payload = await response.json()
  return (payload.documents ?? [])[0] ?? null
}

/** 제목으로 카카오를 찾는다. 판정은 호출자가 한다(제목 일치 + 저자에 인물명). */
export async function kakaoByTitle(title) {
  const key = process.env.KAKAO_REST_API_KEY
  if (!key) throw new Error('KAKAO_REST_API_KEY가 필요합니다.')
  const params = new URLSearchParams({ query: title, size: '5', target: 'title' })
  const response = await fetch(`${KAKAO_URL}?${params}`, { headers: { Authorization: `KakaoAK ${key}` } })
  if (!response.ok) return []
  const payload = await response.json()
  return payload.documents ?? []
}

export function kakaoCreator(document) {
  const authors = (document.authors ?? []).filter(Boolean)
  if (authors.length > 0) return authors.join(', ')
  const translators = (document.translators ?? []).filter(Boolean)
  return translators.length > 0 ? `${translators.join(', ')} (역)` : ''
}

// OpenLibrary는 검색 엔드포인트가 자주 느리다. 20초 넘으면 끊고 null로 본다.
async function olJson(path) {
  try {
    const response = await fetch(`${OPENLIBRARY_URL}${path}`, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20000) })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

/** ISBN으로 OpenLibrary 판본·저작·저자를 한 번에 푼다. 못 찾으면 null. */
export async function openLibraryByIsbn(isbn) {
  const edition = await olJson(`/isbn/${isbn}.json`)
  if (!edition?.key) return null
  const workKey = (edition.works ?? []).map((work) => work.key).find(Boolean) ?? null
  const work = workKey ? await olJson(`${workKey}.json`) : null
  const authorKeys = [
    ...(edition.authors ?? []).map((author) => author.key),
    ...(work?.authors ?? []).map((author) => author.author?.key),
  ].filter(Boolean)
  const authors = []
  for (const key of [...new Set(authorKeys)].slice(0, 3)) {
    const author = await olJson(`${key}.json`)
    if (author?.name) authors.push(author.name)
  }
  const coverId = (edition.covers ?? []).find((value) => Number.isInteger(value) && value > 0)
  return {
    isbn,
    // 언어가 비어 있으면 미상이다. 영어 판본만 en locale로 쓰므로 호출자가 본다.
    languages: (edition.languages ?? []).map((language) => language.key),
    editionKey: edition.key,
    workKey,
    title: String(edition.title ?? work?.title ?? '').trim(),
    authors,
    publisher: (edition.publishers ?? []).map((value) => String(value).trim()).find(Boolean) ?? null,
    publishDate: edition.publish_date ?? null,
    thumbnailUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
    description: typeof work?.description === 'string' ? work.description : (work?.description?.value ?? null),
    sourceUrl: `${OPENLIBRARY_URL}${edition.key}`,
  }
}

/** OpenLibrary 저작 키(/works/OL…W)에서 ISBN13이 있는 영어 판본 하나를 고른다. */
export async function openLibraryEditionForWork(workKey) {
  const payload = await olJson(`${workKey}/editions.json?limit=50`)
  const entries = payload?.entries ?? []
  const english = entries.filter((entry) => {
    const langs = (entry.languages ?? []).map((language) => language.key)
    return langs.length === 0 || langs.includes('/languages/eng')
  })
  const withIsbn = (english.length > 0 ? english : entries).find((entry) => (entry.isbn_13 ?? []).length > 0)
  if (!withIsbn) return null
  return bareIsbn(withIsbn.isbn_13[0])
}

/** 제목·저자로 OpenLibrary 저작을 찾는다. 상위 후보만 돌려주고 판정은 호출자가 한다. */
export async function openLibrarySearch(title, author) {
  const fields = 'key,title,author_name,first_publish_year,isbn,language'
  // title+author 필드 검색이 비면 q= 통합 검색으로 한 번 더 본다.
  let payload = await olJson(`/search.json?${new URLSearchParams({ title, ...(author ? { author } : {}), limit: '5', fields })}`)
  if (!(payload?.docs ?? []).length) payload = await olJson(`/search.json?${new URLSearchParams({ q: [title, author].filter(Boolean).join(' '), limit: '5', fields })}`)
  // 검색 엔드포인트는 잠깐씩 빈 응답을 낸다. 한 번은 다시 본다.
  if (!(payload?.docs ?? []).length) { await sleep(3000); payload = await olJson(`/search.json?${new URLSearchParams({ q: [title, author].filter(Boolean).join(' '), limit: '5', fields })}`) }
  return (payload?.docs ?? []).map((doc) => ({
    workKey: doc.key,
    title: doc.title,
    authors: doc.author_name ?? [],
    year: doc.first_publish_year ?? null,
    isbns: (doc.isbn ?? []).map(bareIsbn).filter((value) => value.length === 13),
    languages: doc.language ?? [],
  }))
}

// ── 위키데이터 ───────────────────────────────────────────────────────────

/** WDQS 한 번 호출. 느리고 한도가 있으니 호출자가 묶어서 부른다. */
export async function wdqs(sparql) {
  const response = await fetch(`${WDQS_URL}?format=json`, {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json' },
    body: new URLSearchParams({ query: sparql }),
  })
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('retry-after')) || 60
    const error = new Error(`WDQS 429 (Retry-After ${retryAfter}s)`)
    error.retryAfter = retryAfter
    throw error
  }
  if (!response.ok) throw new Error(`WDQS ${response.status}`)
  const payload = await response.json()
  return payload.results?.bindings ?? []
}

export const wdValue = (binding, name) => binding?.[name]?.value ?? null
export const wdQid = (binding, name) => {
  const value = wdValue(binding, name)
  return value ? value.split('/').pop() : null
}

/** 위키데이터 엔티티 API. 라벨·클레임·한국어 위키 사이트링크를 50개씩 받는다. WDQS보다 훨씬 싸고 안 끊긴다. */
export async function wbEntities(qids) {
  const out = new Map()
  for (let index = 0; index < qids.length; index += 50) {
    const ids = qids.slice(index, index + 50)
    const params = new URLSearchParams({ action: 'wbgetentities', ids: ids.join('|'), props: 'labels|claims|sitelinks', languages: 'en|ko', sitefilter: 'kowiki', format: 'json' })
    const response = await fetch(`https://www.wikidata.org/w/api.php?${params}`, { headers: { 'User-Agent': USER_AGENT } })
    if (!response.ok) throw new Error(`wbgetentities ${response.status}`)
    const payload = await response.json()
    for (const [qid, entity] of Object.entries(payload.entities ?? {})) {
      const claim = (property) => (entity.claims?.[property] ?? []).map((row) => row.mainsnak?.datavalue?.value).filter((value) => value !== undefined)
      out.set(qid, {
        en: entity.labels?.en?.value ?? null,
        ko: entity.labels?.ko?.value ?? null,
        kowiki: entity.sitelinks?.kowiki?.title ?? null,
        isbn13: claim('P212').map(bareIsbn).filter((value) => value.length === 13),
        isbn10: claim('P957').map(bareIsbn).filter((value) => value.length === 10),
        olid: claim('P648').map(String),
        types: claim('P31').map((value) => value?.id).filter(Boolean),
        // 판본 항목(P629 있음)은 저작이 아니라 그 저작의 한 판본이다. 대조는 저작 단위로 한다.
        editionOf: claim('P629').map((value) => value?.id).filter(Boolean),
        year: claim('P577').map((value) => String(value?.time ?? '').slice(1, 5)).find((value) => /^\d{4}$/.test(value)) ?? null,
      })
    }
  }
  return out
}

// ── 판본 종류 ────────────────────────────────────────────────────────────

// 트리거가 만든 판본은 종류가 비어 있다. 단권으로 보이는 책만 full/complete로 채우고 다권·세트는 사람 판단으로 남긴다.
export const MULTIPART = /(\d+\s*권|제?\s*\d+\s*권|\s\d+\s*:|세트|상권|하권|중권|\(상\)|\(하\)|\(중\)|전\s*\d+\s*권)/
export async function backfillEditionKinds(db, contentIds, titleById) {
  const single = contentIds.filter((id) => !MULTIPART.test(String(titleById.get(id) ?? '')))
  let filled = 0
  for (let index = 0; index < single.length; index += 200) {
    const { data, error } = await db.from('figure_book_editions')
      .update({ edition_kind: 'full', text_scope: 'complete' })
      .in('content_id', single.slice(index, index + 200)).is('edition_kind', null).select('id')
    if (error) throw new Error(`판본 종류 채우기 실패: ${error.message}`)
    filled += (data ?? []).length
  }
  console.log(`  판본 종류 채움 ${filled} (다권·세트 ${contentIds.length - single.length}권 제외)`)
  return filled
}

export function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }
