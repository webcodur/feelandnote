/**
 * 인물 도서의 작품·판본을 한 프로세스에서 대량 등록한다.
 *
 * `figure-books:book`은 작품 하나를 신중히 넣는 도구라 호출마다 BOOK 카탈로그를 통째로 다시 읽고
 * SSH 원자 트랜잭션을 연다. 수백~수천 건을 그 도구로 반복하면 같은 데이터를 그만큼 다시 읽는다.
 * 이 스크립트는 카탈로그를 한 번만 읽고 카카오 조회와 삽입을 배치로 처리한다.
 *
 * content_id는 `figure-books:book`과 같은 규칙(UUID v5, fiction-source-work:<identity>)으로 만들어
 * 두 경로가 같은 작품에 같은 ID를 준다.
 *
 * node --env-file=.env scripts/figure-books/bulk-register-books.mjs --dry
 * node --env-file=.env scripts/figure-books/bulk-register-books.mjs --apply
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { existsSync } from 'node:fs'
import { backfillEditionKinds as backfillKinds, wikidataIdentity } from './lib/figure-work.mjs'

const PAGE_SIZE = 1000
const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book'

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

const apply = process.argv.includes('--apply')
const dbUrl = process.env.NEXT_PUBLIC_DB_API_URL
const dbKey = process.env.DB_SECRET_KEY
const kakaoKey = process.env.KAKAO_REST_API_KEY
if (!dbUrl || !dbKey) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY가 필요합니다.')
if (!kakaoKey) throw new Error('KAKAO_REST_API_KEY가 필요합니다.')
const db = createClient(dbUrl, dbKey, { auth: { autoRefreshToken: false, persistSession: false } })

// figure-books:book과 같은 네임스페이스를 쓴다. 규칙이 갈리면 같은 작품이 두 번 생긴다.
function deterministicContentId(name) {
  const namespace = Buffer.from('9a1debef9d5f5d9a82918e8ef3822e97', 'hex')
  const digest = createHash('sha1').update(namespace).update(name, 'utf8').digest().subarray(0, 16)
  digest[6] = (digest[6] & 0x0f) | 0x50
  digest[8] = (digest[8] & 0x3f) | 0x80
  const hex = digest.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const bare = (value) => String(value ?? '').replace(/[^0-9Xx]/g, '')

async function allRows(label, page) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`${label} 조회 실패: ${error.message}`)
    const current = data ?? []
    rows.push(...current)
    if (current.length < PAGE_SIZE) return rows
  }
}

async function kakaoByIsbn(isbn) {
  const params = new URLSearchParams({ query: isbn, size: '3', target: 'isbn' })
  const response = await fetch(`${KAKAO_URL}?${params}`, { headers: { Authorization: `KakaoAK ${kakaoKey}` } })
  if (!response.ok) return null
  const payload = await response.json()
  return (payload.documents ?? [])[0] ?? null
}

function creatorOf(document) {
  const authors = (document.authors ?? []).filter(Boolean)
  if (authors.length > 0) return authors.join(', ')
  const translators = (document.translators ?? []).filter(Boolean)
  return translators.length > 0 ? `${translators.join(', ')} (역)` : ''
}

/**
 * 위키데이터 작품 정보 추출본(wikidata-works.jsonl + 상세 캐시)이 있으면 ISBN → 저작 QID 지도를 만든다.
 * 그 ISBN의 작품은 `book/<isbn>`이 아니라 `wikidata:q…` 정체성으로 만들어 영문판과 같은 행에 모인다.
 */
function loadWikidataIsbnMap(dataDir) {
  const extracted = resolve(dataDir, 'wikidata-works.jsonl')
  const detail = resolve(dataDir, 'wikidata-works-detail.json')
  if (!existsSync(extracted)) return new Map()
  const cache = existsSync(detail) ? JSON.parse(readFileSync(detail, 'utf8')) : {}
  const map = new Map()
  for (const line of readFileSync(extracted, 'utf8').split('\n')) {
    if (!line.trim()) continue
    for (const work of JSON.parse(line).works ?? []) {
      const info = work.types ? work : { ...work, ...(cache[work.qid] ?? {}) }
      const qid = (info.editionOf ?? [])[0] ?? work.qid
      for (const isbn of info.isbn13 ?? []) if (!map.has(isbn)) map.set(isbn, qid)
    }
  }
  return map
}

async function main() {
  const queuePath = resolve(process.cwd(), argumentValue('queue', '../../data/celeb/figure-books/appearance-review-queue-2026-09-04.json'))
  const reportPath = resolve(process.cwd(), argumentValue('report', '../../data/celeb/figure-books/bulk-register-report.json'))
  const limit = Number(argumentValue('limit', '0')) || 0
  const concurrency = Number(argumentValue('concurrency', '8'))

  const wikidataByIsbn = loadWikidataIsbnMap(dirname(queuePath))

  // 1) 이미 있는 것을 한 번만 읽는다.
  const [existingContents, existingEditions] = await Promise.all([
    allRows('contents', (from, to) => db.from('contents')
      .select('id,external_id').eq('type', 'BOOK').order('id').range(from, to)),
    allRows('figure_book_editions', (from, to) => db.from('figure_book_editions')
      .select('content_id,isbn,locale').eq('locale', 'ko').order('content_id').range(from, to)),
  ])
  // 판본은 (작품, locale, ISBN) 조합으로 유니크하다. 부분 인덱스라 ON CONFLICT를 못 쓰므로 미리 거른다.
  const existingEditionKeys = new Set(existingEditions.map((row) => `${row.content_id}:${bare(row.isbn)}`))
  const existingIds = new Set(existingContents.map((row) => row.id))
  const registeredIsbns = new Set([
    ...existingContents.map((row) => bare(row.external_id)),
    ...existingEditions.map((row) => bare(row.isbn)),
  ].filter(Boolean))

  // 2) 검수표에서 아직 없는 ISBN만 추린다.
  const queue = JSON.parse(readFileSync(queuePath, 'utf8'))
  const seen = new Set()
  const targets = []
  for (const row of queue.fresh ?? []) {
    const isbn = bare(row.kakao?.isbn)
    if (!isbn || isbn.length !== 13 || seen.has(isbn) || registeredIsbns.has(isbn)) continue
    seen.add(isbn)
    targets.push({ isbn, title: row.kakao.title, creator: (row.kakao.authors ?? [])[0] ?? '' })
  }
  if (process.argv.includes('--backfill-kinds')) {
    const { data, error } = await db.from('contents').select('id,metadata').eq('type', 'BOOK').gte('created_at', '2026-09-06').eq('external_source', 'kakao_book')
    if (error) throw new Error(error.message)
    const mine = (data ?? []).filter((row) => row.metadata?.figureBook?.source !== 'wikidata-works')
    await backfillEditionKinds(mine.map((row) => row.id), new Map(mine.map((row) => [row.id, row.metadata?.figureBook?.workTitle])))
    return
  }
  const work = limit > 0 ? targets.slice(0, limit) : targets
  console.log(`기존 등록 ISBN ${registeredIsbns.size}건 / 신규 대상 ${targets.length}건 / 이번 실행 ${work.length}건`)
  if (work.length === 0) return

  // 3) 카카오 상세를 동시에 받는다.
  const details = new Array(work.length)
  let cursor = 0
  const fetcher = async () => {
    while (cursor < work.length) {
      const index = cursor
      cursor += 1
      details[index] = await kakaoByIsbn(work[index].isbn)
      if ((index + 1) % 100 === 0) console.log(`  카카오 조회 ${index + 1}/${work.length}`)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, work.length) }, fetcher))

  // 4) 삽입할 행을 만든다.
  const contents = []
  const locales = []
  const editions = []      // 이미 있는 작품(위키데이터 저작)에 ko 판본만 더하는 경우. 트리거가 안 도니 직접 넣는다.
  const figureBooks = []
  const skipped = []

  for (let index = 0; index < work.length; index += 1) {
    const target = work[index]
    const document = details[index]
    if (!document) { skipped.push({ isbn: target.isbn, reason: 'kakao_not_found' }); continue }
    const title = String(document.title ?? '').trim()
    const creator = creatorOf(document)
    if (!title || !creator) { skipped.push({ isbn: target.isbn, reason: 'title_or_creator_missing' }); continue }

    const qid = wikidataByIsbn.get(target.isbn) ?? null
    const identity = qid ? wikidataIdentity(qid) : `book/${target.isbn}`
    const contentId = deterministicContentId(`fiction-source-work:${identity}`)
    const releaseDate = document.datetime ? String(document.datetime).slice(0, 10) : null
    const sourceUrl = document.url || null
    const sources = {
      primary: 'kakao_book',
      title: sourceUrl, creator: sourceUrl, isbn: sourceUrl,
      publisher: sourceUrl, thumbnail: sourceUrl,
      description: document.contents ? sourceUrl : 'confirmed_unavailable',
    }

    contents.push({
      id: contentId,
      type: 'BOOK',
      external_source: 'kakao_book',
      external_id: target.isbn,
      release_date: releaseDate,
      metadata: {
        isbn: target.isbn,
        link: sourceUrl,
        publisher: document.publisher ?? null,
        publishDate: releaseDate,
        salesStatus: document.status ?? null,
        figureBook: {
          workTitle: title,
          workCreator: creator,
          workIdentity: identity,
          ...(qid ? { wikidataQid: qid } : {}),
          koTranslationStatus: 'published',
        },
      },
    })
    const locale = {
      content_id: contentId, locale: 'ko', title, creator,
      description: document.contents || null, isbn: target.isbn,
      publisher: document.publisher || null, thumbnail_url: document.thumbnail || null,
      verified: true, sources,
    }
    locales.push(locale)
    if (existingIds.has(contentId)) {
      // 같은 저작이 이미 있다(영문판만 있는 위키데이터 작품 등). contents는 건드리지 않고 ko locale·판본만 붙인다.
      contents.pop()
      if (!existingEditionKeys.has(`${contentId}:${target.isbn}`)) editions.push({ ...locale, release_date: releaseDate, sort_order: 0, edition_kind: 'full', text_scope: 'complete' })
    } else {
      figureBooks.push({ content_id: contentId })
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    totals: { targets: work.length, insertable: contents.length, koOnlyForExisting: editions.length, wikidataIdentities: contents.filter((row) => row.metadata.figureBook.wikidataQid).length, skipped: skipped.length },
    skipped,
  }
  mkdirSync(dirname(reportPath), { recursive: true })
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(`삽입 대상 ${contents.length}건 (위키데이터 정체성 ${report.totals.wikidataIdentities}) / 기존 작품에 ko 판본만 ${editions.length}건 / 건너뜀 ${skipped.length}건`)

  if (!apply) {
    console.log('dry-run이다. 반영하려면 --apply를 붙인다.')
    return
  }

  // 5) 표 순서를 지켜 배치로 넣는다. figure_book_contents가 들어가면 트리거가 locale마다 판본을 만든다.
  const chunk = 200
  for (const [table, rows, conflict] of [
    ['contents', contents, 'id'],
    ['content_locales', locales, 'content_id,locale'],
    ['figure_book_contents', figureBooks, 'content_id'],
  ]) {
    for (let index = 0; index < rows.length; index += chunk) {
      const { error } = await db.from(table).upsert(rows.slice(index, index + chunk), { onConflict: conflict, ignoreDuplicates: true })
      if (error) throw new Error(`${table} 반영 실패(${index}): ${error.message}`)
    }
    console.log(`  ${table} ${rows.length}`)
  }
  for (let index = 0; index < editions.length; index += chunk) {
    const { error } = await db.from('figure_book_editions').insert(editions.slice(index, index + chunk))
    if (error) throw new Error(`figure_book_editions 반영 실패(${index}): ${error.message}`)
  }
  if (editions.length > 0) console.log(`  figure_book_editions ${editions.length} (기존 작품에 ko 판본 추가)`)
  await backfillEditionKinds(contents.map((row) => row.id), new Map(contents.map((row) => [row.id, row.metadata.figureBook.workTitle])))
  console.log(`
반영 완료 — 작품 ${contents.length}권`)
}

const backfillEditionKinds = (ids, titleById) => backfillKinds(db, ids, titleById)

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
