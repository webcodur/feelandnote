/*
  판본 대조를 통과한 건으로 pick.mjs 입력을 만든다.
  크롬 경로(verify-edition)와 codex 경로(by-codex) 결과를 함께 받아 한 목록으로 합친다.

  content_id는 등록 영수증(manifests/*.receipt.json)과 DB의 ko 판본 ISBN에서 되찾는다.
  작품이 아직 등록되지 않은 건은 링크를 만들 수 없으므로 제외한다.

  사용: node picks-from-verify.mjs <선택.json> [--verify <대조.json>] [--codex <조회.jsonl>] [--targets <대상.json>]
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../../..')

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

const [outFile] = process.argv.slice(2).filter((argument) => !argument.startsWith('--'))
if (!outFile) throw new Error('선택.json 경로가 필요합니다.')

const verifyPath = path.resolve(REPO, argumentValue('verify', 'data/coupang/appearance-edition-check-r2-2026-09-06.json'))
const codexPath = path.resolve(REPO, argumentValue('codex', 'data/coupang/coupang-by-codex-2026-09-05.jsonl'))
const targetsPath = path.resolve(REPO, argumentValue('targets', 'data/coupang/appearance-verify-targets-r2-2026-09-06.json'))
const manifestDir = path.resolve(REPO, 'data/celeb/figure-books/manifests')

const bare = (value) => String(value ?? '').replace(/[^0-9Xx]/g, '')

// 등록 영수증에서 ISBN → contentId를 거둔다. 반영이 끝난 작품만 들어 있다.
const contentByIsbn = new Map()
for (const name of fs.readdirSync(manifestDir)) {
  if (!name.endsWith('.receipt.json')) continue
  const receipt = JSON.parse(fs.readFileSync(path.join(manifestDir, name), 'utf8'))
  if (!/applied/.test(receipt.status ?? '')) continue
  const isbn = bare(String(receipt.workIdentity ?? '').split('/').pop())
  const contentId = receipt.plan?.contentId
  if (isbn && contentId) contentByIsbn.set(isbn, contentId)
}

// 대량 등록분(bulk-register-books)은 영수증이 없다. DB의 ko 판본 ISBN으로도 작품을 되찾는다.
const { allRows, dbClient } = await import('../figure-books/lib/figure-work.mjs')
const db = dbClient()
const editions = await allRows('figure_book_editions', (from, to) => db.from('figure_book_editions').select('content_id,isbn').eq('locale', 'ko').order('id').range(from, to))
// 영수증은 통합·삭제된 옛 작품 ID를 가리킬 수 있다. DB의 현재 판본이 우선이다.
for (const row of editions) {
  const isbn = bare(row.isbn)
  if (isbn) contentByIsbn.set(isbn, row.content_id)
}

// 상품명·검색어는 후보 수집 결과에 있다.
const targetByKey = new Map()
if (fs.existsSync(targetsPath)) {
  for (const row of JSON.parse(fs.readFileSync(targetsPath, 'utf8'))) {
    targetByKey.set(`${bare(row.isbn)}:${row.productId}`, row)
  }
}

const picks = []
const skipped = []
const seen = new Set()

function push({ isbn, productId, productUrl, title, name, query, delivery, contentIdHint }) {
  const key = bare(isbn)
  if (seen.has(key)) return
  const contentId = contentIdHint ?? contentByIsbn.get(key)
  if (!contentId) {
    skipped.push({ isbn: key, title, reason: 'content_not_registered' })
    return
  }
  const evidence = [...new Set(String(delivery ?? '').split(/[·,\s]+/).filter((word) => (
    /(로켓배송|로켓프레시|로켓직구|오늘도착|새벽도착|내일도착|도착)/.test(word)
  )))].slice(0, 4)
  if (evidence.length === 0) {
    skipped.push({ isbn: key, title, reason: 'no_badge_text' })
    return
  }
  seen.add(key)
  picks.push({
    content_id: contentId,
    isbn: key,
    title,
    query: query ?? title,
    name,
    productId,
    productUrl: productUrl ?? `https://www.coupang.com/vp/products/${productId}`,
    qualityEvidence: evidence,
    state: 'pending_short_link',
  })
}

// 크롬 경로 결과
if (fs.existsSync(verifyPath)) {
  for (const row of JSON.parse(fs.readFileSync(verifyPath, 'utf8'))) {
    if (row.isbnVerdict !== 'match' || !row.hasRealBadge) continue
    const target = targetByKey.get(`${bare(row.wantIsbn)}:${row.productId}`)
    push({
      isbn: row.wantIsbn,
      productId: row.productId,
      productUrl: target?.productUrl,
      title: row.title,
      name: target?.name ?? row.title,
      query: target?.query,
      delivery: (row.delivery ?? []).join(' '),
    })
  }
}

// codex 경로 결과
if (fs.existsSync(codexPath)) {
  for (const line of fs.readFileSync(codexPath, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const row = JSON.parse(line)
    if (!row.usable || !row.found) continue
    push({
      isbn: row.target.isbn,
      productId: row.found.productId,
      productUrl: row.found.productUrl,
      title: row.target.title,
      name: row.found.name,
      query: row.target.title,
      delivery: row.found.delivery,
      contentIdHint: row.target.content_id ?? undefined,
    })
  }
}

fs.mkdirSync(path.dirname(path.resolve(REPO, outFile)), { recursive: true })
fs.writeFileSync(path.resolve(REPO, outFile), JSON.stringify(picks, null, 2), 'utf8')

const reasons = {}
for (const row of skipped) reasons[row.reason] = (reasons[row.reason] ?? 0) + 1
console.log(`링크 대상 ${picks.length}권 / 제외 ${skipped.length}권`)
if (skipped.length > 0) console.log('  제외 사유:', JSON.stringify(reasons))
console.log(`WROTE ${outFile}`)
