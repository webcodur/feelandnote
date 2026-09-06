/**
 * 작품 후보 조사 결과를 DB 재고와 맞춰 검수 대기표를 만든다.
 * 카카오 ISBN이 이미 등록된 작품이면 그 작품을 재사용하고, 없으면 신규 작품 후보로 가른다.
 * DB는 읽기만 한다.
 *
 * node --env-file=.env scripts/figure-books/appearance-review-prep.mjs --in ../../data/celeb/figure-books/appearance-muse-2026-09-04.jsonl
 * node --env-file=.env scripts/figure-books/appearance-review-prep.mjs --in <파일> --coupang-targets ../../data/coupang/appearance-targets-2026-09-04.json
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { isOnSale } from './appearance-sales-status.mjs'

const PAGE_SIZE = 1000

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

const dbUrl = process.env.NEXT_PUBLIC_DB_API_URL
const dbKey = process.env.DB_SECRET_KEY
if (!dbUrl || !dbKey) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY가 필요합니다.')

const db = createClient(dbUrl, dbKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

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

function bareIsbn(value) {
  return String(value ?? '').replace(/[\s-]/g, '')
}

function squash(value) {
  return String(value ?? '').replace(/[\s·:;,()[\]{}"'`~!?.「」『』<>-]/g, '').toLowerCase()
}

// 제목이 인물을 직접 부르는 책은 전기·평전일 가능성이 높다. 성만 쓰는 제목도 잡는다.
function titleNamesPerson(title, nickname) {
  const flat = squash(title)
  const full = squash(nickname)
  if (full.length >= 2 && flat.includes(full)) return true
  return String(nickname ?? '')
    .split(/\s+/)
    .filter((part) => part.length >= 2)
    .some((part) => flat.includes(squash(part)))
}

function pickPerPerson(rows, sales, limit) {
  const byPerson = new Map()
  for (const row of rows) {
    const key = row.person.slug
    byPerson.set(key, [...(byPerson.get(key) ?? []), row])
  }

  const picked = []
  for (const [, candidates] of byPerson) {
    const scored = candidates.map((row) => {
      const sale = sales[bareIsbn(row.kakao.isbn)]
      const year = Number(String(row.kakao.datetime ?? '').slice(0, 4)) || 0
      const score = (titleNamesPerson(row.kakao.title, row.person.nickname) ? 4 : 0)
        + (row.kakaoReason === 'creator_and_publisher' ? 2 : 0)
        + (sale && isOnSale(sale) ? 1 : 0)
      return { row, score, year }
    })
    scored.sort((left, right) => right.score - left.score || right.year - left.year)
    picked.push(...scored.slice(0, limit).map((entry) => entry.row))
  }
  return picked
}

async function loadStock() {
  const locales = await allRows('content_locales', (from, to) => db
    .from('content_locales')
    .select('content_id,locale,title,isbn')
    .eq('locale', 'ko')
    .order('content_id')
    .range(from, to))

  const editions = await allRows('figure_book_editions', (from, to) => db
    .from('figure_book_editions')
    .select('content_id,isbn,locale')
    .eq('locale', 'ko')
    .order('content_id')
    .range(from, to))

  const products = await allRows('figure_book_products', (from, to) => db
    .from('figure_book_products')
    .select('edition_id,platform,is_active')
    .eq('is_active', true)
    .order('edition_id')
    .range(from, to))

  const byIsbn = new Map()
  for (const row of locales) {
    const key = bareIsbn(row.isbn)
    if (key) byIsbn.set(key, { contentId: row.content_id, title: row.title, source: 'content_locales' })
  }
  for (const row of editions) {
    const key = bareIsbn(row.isbn)
    if (key && !byIsbn.has(key)) byIsbn.set(key, { contentId: row.content_id, title: null, source: 'figure_book_editions' })
  }

  return { byIsbn, activeProducts: products.length }
}

async function main() {
  const inPath = resolve(process.cwd(), argumentValue('in', '../../data/celeb/figure-books/appearance-muse-2026-09-04.jsonl'))
  const outPath = resolve(process.cwd(), argumentValue('out', '../../data/celeb/figure-books/appearance-review-queue-2026-09-04.json'))
  const coupangPath = argumentValue('coupang-targets')

  const rows = readFileSync(inPath, 'utf8').trim().split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))

  const { byIsbn } = await loadStock()

  const reuse = []
  const fresh = []
  const unverified = []

  for (const row of rows) {
    for (const book of row.books) {
      const entry = {
        person: row.person,
        title: book.title,
        creator: book.creator,
        publisher: book.publisher,
        evidenceUrl: book.evidenceUrl,
        scope: book.scope,
        kakao: book.kakao,
        kakaoReason: book.kakaoReason,
      }
      if (!book.kakao?.isbn) {
        unverified.push(entry)
        continue
      }
      const known = byIsbn.get(bareIsbn(book.kakao.isbn))
      if (known) reuse.push({ ...entry, contentId: known.contentId, knownTitle: known.title, matchedBy: known.source })
      else fresh.push(entry)
    }
  }

  const uniqueFreshIsbns = new Set(fresh.map((row) => bareIsbn(row.kakao.isbn)))
  const report = {
    generatedAt: new Date().toISOString(),
    source: inPath,
    totals: {
      people: rows.length,
      peopleWithBooks: rows.filter((row) => row.books.length > 0).length,
      bookRows: reuse.length + fresh.length + unverified.length,
      reuseExistingWork: reuse.length,
      newWorkCandidates: fresh.length,
      newWorkDistinctIsbns: uniqueFreshIsbns.size,
      unverifiedByKakao: unverified.length,
    },
    reuse,
    fresh,
    unverified,
  }

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify(report.totals, null, 2))
  console.log(`WROTE ${outPath}`)

  if (coupangPath) {
    // 쿠팡 화면은 건당 사람이 열어야 한다. 카카오가 절판이라 답한 책은 그 앞에서 걷어낸다.
    const salesPath = resolve(process.cwd(), argumentValue('sales', '../../data/celeb/figure-books/kakao-sales-status.json'))
    const sales = existsSync(salesPath) ? JSON.parse(readFileSync(salesPath, 'utf8')) : {}
    const perPerson = Number(argumentValue('per-person', '0')) || 0

    const alive = [...reuse, ...fresh].filter((row) => {
      const sale = sales[bareIsbn(row.kakao.isbn)]
      return !sale || isOnSale(sale)
    })
    const dropped = reuse.length + fresh.length - alive.length

    // 인물당 대표 한 권만 먼저 연다. 등장 작품이 한 권만 서도 얕은 연결은 뒤로 밀린다.
    const ranked = perPerson > 0 ? pickPerPerson(alive, sales, perPerson) : alive

    const seen = new Set()
    const targets = []
    for (const row of ranked) {
      const isbn = bareIsbn(row.kakao.isbn)
      if (seen.has(isbn)) continue
      seen.add(isbn)
      targets.push(row.contentId
        ? { content_id: row.contentId, title: row.kakao.title, creator: row.kakao.authors?.join(', ') ?? row.creator, publisher: row.kakao.publisher, isbn }
        : { candidate_key: `appearance-${isbn}`, title: row.kakao.title, creator: row.kakao.authors?.join(', ') ?? row.creator, publisher: row.kakao.publisher, isbn })
    }
    const target = resolve(process.cwd(), coupangPath)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, JSON.stringify(targets, null, 2), 'utf8')
    console.log(`WROTE ${target} (${targets.length}권 / 절판·미판매로 제외 ${dropped}권)`)
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
