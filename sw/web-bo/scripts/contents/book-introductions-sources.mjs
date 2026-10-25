import { existsSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const unwrap = module => module.default ?? module
const { repoPath } = unwrap(await import('../lib/paths.ts'))
const { toIsbn13 } = unwrap(await import('../../../../packages/content-search/src/book-isbn.ts'))
const { forLocale } = unwrap(await import('../../../../packages/content-search/src/book-introduction.ts'))
const { getKakaoBookByIsbn, fetchDaumBookDescription, getDaumMobileDetailUrl } = unwrap(await import('../../../../packages/content-search/src/kakao-books.ts'))
const { fetchYes24Introduction } = unwrap(await import('./yes24-book-introduction.ts'))
const { createKeyPool, keyPoolStateFile } = unwrap(await import('./gbooks-keypool.ts'))

export const BOOK_INTRODUCTION_PROVIDERS = ['kakao', 'openlibrary', 'google', 'google-page', 'naru', 'yes24']
const TIMEOUT_MS = 20_000, INTERVAL_MS = 350
const descriptionText = value => typeof value === 'string' ? value : value?.value ?? null
const plainText = value => String(value ?? '').replace(/<br\s*\/?\s*>/gi, '\n')
  .replace(/<\/p>/gi, '\n\n').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()

export function googleBooksPageCandidate(html, isbn, locale) {
  if (/unusual traffic|g-recaptcha|recaptcha\/api|Our systems have detected/i.test(html)) throw Error('Google Books CAPTCHA')
  const opening = /<div\b[^>]*\bid=(?:["']synopsistext["']|synopsistext(?=[\s>]))[^>]*>/i.exec(html)
  let description = null
  if (opening) {
    const start = opening.index + opening[0].length, tags = /<\/?div\b[^>]*>/gi
    tags.lastIndex = start
    let depth = 1, tag
    while ((tag = tags.exec(html))) {
      depth += /^<\//.test(tag[0]) ? -1 : 1
      if (!depth) { description = html.slice(start, tag.index); break }
    }
    if (depth) throw Error('Google Books synopsis markup incomplete')
  }
  const pageTitle = plainText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1])
  // 요청 ISBN은 검색 조건일 뿐이다. 실제 페이지 서지를 별도로 남겨 LLM이 대조한다.
  const bibliography = plainText(html.match(/<table\b[^>]*(?:id=["']?metadata_content_table["']?|class=["'][^"']*bib_info[^"']*["'])[^>]*>[\s\S]*?<\/table>/i)?.[0])
  return candidate(`https://books.google.com/books?vid=ISBN${isbn}`, description,
    { requestedIsbn: isbn, pageTitle, bibliography }, locale)
}

async function json(url) {
  await delay(INTERVAL_MS)
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (response.status === 404) return null
  if (!response.ok) throw Error(`HTTP ${response.status}`)
  return response.json()
}

function candidate(sourceUrl, description, identity, locale) {
  const text = plainText(descriptionText(description))
  return { sourceUrl, description: text || null, identity, languageMatches: Boolean(forLocale(text, locale)) }
}

/** 응답은 검수 자료다. ISBN·영문 표식·기계 일치만으로 DB 반영을 승인하지 않는다. */
export function createBookIntroductionCollectors() {
  let pool
  const googlePool = () => {
    if (pool) return pool
    // 기존 무료 API 사용량을 버리고 일일 한도를 다시 세지 않는다.
    const old = keyPoolStateFile(repoPath('data/celeb/book-introductions/gbooks'))
    const dir = join(tmpdir(), 'feelandnote', 'google-books-quota')
    if (!existsSync(old)) mkdirSync(dir, { recursive: true })
    pool = createKeyPool(existsSync(old) ? old : keyPoolStateFile(dir), [repoPath('sw/web/.env')])
    return pool
  }
  return {
    async 'google-page'(target) {
      const isbn = toIsbn13(target.isbn ?? '')
      if (!isbn) return { status: 'unavailable', reason: 'no-isbn' }
      await delay(INTERVAL_MS)
      const response = await fetch(`https://books.google.com/books?vid=ISBN${isbn}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (!response.ok) throw Error(`Google Books page HTTP ${response.status}`)
      if (!/^books\.google\.[a-z.]+$/.test(new URL(response.url).hostname)) throw Error('Google Books page redirected outside books')
      const charset = response.headers.get('content-type')?.match(/charset=([^;\s]+)/i)?.[1] ?? 'utf-8'
      const html = new TextDecoder(charset).decode(await response.arrayBuffer())
      return { status: 'ok', candidates: [googleBooksPageCandidate(html, isbn, target.locale)] }
    },
    async kakao(target) {
      if (target.locale !== 'ko' || !process.env.KAKAO_REST_API_KEY) return { status: 'unavailable', reason: 'locale-or-key' }
      const isbn = toIsbn13(target.isbn ?? '')
      if (!isbn) return { status: 'unavailable', reason: 'no-isbn' }
      const book = await getKakaoBookByIsbn(isbn)
      if (!book) return { status: 'ok', candidates: [] }
      const sourceUrl = `https://dapi.kakao.com/v3/search/book?target=isbn&query=${isbn}`
      const identity = { isbn: book.metadata.isbn, title: book.title, creator: book.creator }
      const candidates = [candidate(sourceUrl, book.metadata.description, identity, 'ko')]
      const daum = getDaumMobileDetailUrl(book.metadata.link)
      if (daum) {
        try { candidates.push(candidate(daum, await fetchDaumBookDescription(daum), identity, 'ko')) }
        catch (error) { return { status: 'error', reason: String(error?.message ?? 'Daum request failed'), candidates } }
      }
      return { status: 'ok', candidates }
    },
    async openlibrary(target) {
      const isbn = toIsbn13(target.isbn ?? '')
      if (target.locale !== 'en' || !isbn) return { status: 'unavailable', reason: 'locale-or-isbn' }
      const edition = await json(`https://openlibrary.org/isbn/${isbn}.json`)
      if (!edition) return { status: 'ok', candidates: [] }
      const identity = { isbn: [...edition.isbn_13 ?? [], ...edition.isbn_10 ?? []], title: edition.title,
        authors: edition.authors, languages: edition.languages, physicalFormat: edition.physical_format }
      const sourceUrl = /^\/books\/OL\d+M$/.test(edition.key ?? '') ? `https://openlibrary.org${edition.key}` : `https://openlibrary.org/isbn/${isbn}`
      const candidates = [candidate(sourceUrl, edition.description, identity, 'en')]
      for (const { key } of edition.works ?? []) {
        if (!/^\/works\/OL\d+W$/.test(key)) continue
        const work = await json(`https://openlibrary.org${key}.json`)
        if (work) candidates.push(candidate(`https://openlibrary.org${key}`, work.description,
          { ...identity, workTitle: work.title, workAuthors: work.authors, fromWork: true }, 'en'))
      }
      return { status: 'ok', candidates }
    },
    async google(target) {
      let keyPool
      try { keyPool = googlePool() } catch { return { status: 'unavailable', reason: 'no-key' } }
      const isbn = toIsbn13(target.isbn ?? ''), candidates = [], queries = []
      if (isbn) queries.push(`isbn:${isbn}`)
      queries.push(`${target.title} ${target.creator ?? ''}`.trim())
      for (const q of queries) {
        let data, accepted = false
        for (;;) {
          const slot = keyPool.next()
          if (!slot) return { status: 'unavailable', reason: 'quota', candidates }
          keyPool.spend(slot.id)
          await delay(INTERVAL_MS)
          const response = await fetch('https://www.googleapis.com/books/v1/volumes?' + new URLSearchParams({ q, maxResults: '10', key: slot.key }),
            { signal: AbortSignal.timeout(TIMEOUT_MS) })
          if ([400, 403, 429].includes(response.status)) {
            const body = await response.text()
            if (/key expired|key not found|keyInvalid/i.test(body)) keyPool.dead(slot.id); else keyPool.exhausted(slot.id)
            continue
          }
          if (!response.ok) throw Error(`Google HTTP ${response.status}`)
          data = await response.json(); break
        }
        for (const item of data?.items ?? []) {
          const v = item.volumeInfo ?? {}
          candidates.push(candidate(`https://books.google.com/books?id=${encodeURIComponent(item.id)}`, v.description,
            { title: v.title, subtitle: v.subtitle, authors: v.authors, identifiers: v.industryIdentifiers, language: v.language, query: q }, target.locale))
          if (v.description && (!isbn || v.industryIdentifiers?.some(id => toIsbn13(id.identifier) === isbn))) accepted = true
        }
        if (accepted) break
      }
      return { status: 'ok', candidates }
    },
    async naru(target) {
      const isbn = toIsbn13(target.isbn ?? '')
      if (target.locale !== 'ko' || !isbn || !process.env.DATA4LIBRARY_API_KEY) return { status: 'unavailable', reason: 'locale-isbn-or-key' }
      const payload = await json('https://data4library.kr/api/srchDtlList?' + new URLSearchParams({ authKey: process.env.DATA4LIBRARY_API_KEY, isbn13: isbn, format: 'json' }))
      const error = payload?.response?.error ?? payload?.response?.errCode
      if (error) {
        if (/해당하는 도서가 없|도서를 찾을 수 없|검색결과가 없|등록된 도서가 없/.test(JSON.stringify(error))) return { status: 'ok', candidates: [] }
        throw Error('정보나루 요청 실패(한도 또는 제공자 오류)')
      }
      if (!payload?.response) throw Error('정보나루 응답 형식 오류')
      return { status: 'ok', candidates: (payload.response.detail ?? []).map(item => item.book).filter(Boolean)
        .map(book => candidate(`https://data4library.kr/bookV?isbn=${isbn}`, book.description,
          { isbn: book.isbn13, title: book.bookname, authors: book.authors, publisher: book.publisher }, 'ko')) }
    },
    async yes24(target) {
      const isbn = toIsbn13(target.isbn ?? '')
      if (target.locale !== 'ko' || !isbn || !process.env.YES24_API_KEY) return { status: 'unavailable', reason: 'locale-isbn-or-key' }
      const result = await fetchYes24Introduction(isbn, process.env.YES24_API_KEY)
      return { status: 'ok', candidates: result.sourceUrl ? [candidate(result.sourceUrl, result.description,
        { isbn: result.isbn, title: result.title, creator: result.author }, 'ko')] : [] }
    },
  }
}
