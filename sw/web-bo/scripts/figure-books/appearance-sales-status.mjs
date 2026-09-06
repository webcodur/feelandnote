/**
 * 작품 후보 조사 결과의 ISBN을 카카오로 다시 조회해 판매 신호만 따로 모은다.
 * 쿠팡 화면을 건당 사람이 열어야 하므로, 그 앞에 무료 필터를 두는 용도다.
 * 조사 결과 파일은 읽기만 하고 캐시 파일에만 쓴다. 배치가 도는 중에도 안전하다.
 *
 * node --env-file=.env scripts/figure-books/appearance-sales-status.mjs
 * node --env-file=.env scripts/figure-books/appearance-sales-status.mjs --in <조사결과.jsonl> --cache <캐시.json>
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book'

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

const kakaoKey = process.env.KAKAO_REST_API_KEY
if (!kakaoKey) throw new Error('KAKAO_REST_API_KEY가 필요합니다.')

function bareIsbn(value) {
  return String(value ?? '').replace(/[\s-]/g, '')
}

async function lookupIsbn(isbn) {
  const params = new URLSearchParams({ query: isbn, size: '3', target: 'isbn' })
  const response = await fetch(`${KAKAO_URL}?${params}`, {
    headers: { Authorization: `KakaoAK ${kakaoKey}` },
  })
  if (!response.ok) return { error: `http_${response.status}` }
  const payload = await response.json()
  const document = (payload.documents ?? [])[0]
  if (!document) return { error: 'not_found' }
  return {
    title: document.title,
    publisher: document.publisher,
    status: document.status ?? '',
    price: typeof document.price === 'number' ? document.price : null,
    salePrice: typeof document.sale_price === 'number' ? document.sale_price : null,
    datetime: document.datetime ?? null,
  }
}

// 카카오는 판매 중이면 status에 값을 채우고 sale_price에 실제 판매가를 준다.
// 둘 다 비면 절판·미판매로 본다. 판정 기준을 한 곳에 둔다.
export function isOnSale(record) {
  if (!record || record.error) return false
  const hasStatus = Boolean(String(record.status ?? '').trim())
  const hasSalePrice = typeof record.salePrice === 'number' && record.salePrice > 0
  return hasStatus || hasSalePrice
}

async function main() {
  const inPath = resolve(process.cwd(), argumentValue('in', '../../data/celeb/figure-books/appearance-muse-2026-09-04.jsonl'))
  const cachePath = resolve(process.cwd(), argumentValue('cache', '../../data/celeb/figure-books/kakao-sales-status.json'))
  const concurrency = Number(argumentValue('concurrency', '4'))

  const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}

  const isbns = new Set()
  for (const line of readFileSync(inPath, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let row
    try { row = JSON.parse(line) } catch { continue }
    for (const book of row.books ?? []) {
      const isbn = bareIsbn(book.kakao?.isbn)
      if (isbn && !cache[isbn]) isbns.add(isbn)
    }
  }

  const pending = [...isbns]
  console.log(`캐시 ${Object.keys(cache).length}건 / 새로 조회 ${pending.length}건 (동시 ${concurrency})`)

  let cursor = 0
  let done = 0
  const worker = async () => {
    while (cursor < pending.length) {
      const isbn = pending[cursor]
      cursor += 1
      cache[isbn] = await lookupIsbn(isbn)
      done += 1
      if (done % 50 === 0) {
        mkdirSync(dirname(cachePath), { recursive: true })
        writeFileSync(cachePath, JSON.stringify(cache, null, 1), 'utf8')
        console.log(`  ${done}/${pending.length}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker))

  mkdirSync(dirname(cachePath), { recursive: true })
  writeFileSync(cachePath, JSON.stringify(cache, null, 1), 'utf8')

  const values = Object.values(cache)
  const onSale = values.filter(isOnSale).length
  const missing = values.filter((row) => row.error).length
  console.log(`\n총 ${values.length}건 / 판매 중 ${onSale}건 / 절판·미판매 ${values.length - onSale - missing}건 / 조회 실패 ${missing}건`)
  console.log(`WROTE ${cachePath}`)
}

if (process.argv[1] && process.argv[1].split('\\').join('/').endsWith('appearance-sales-status.mjs')) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
