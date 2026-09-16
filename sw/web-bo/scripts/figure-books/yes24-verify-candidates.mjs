/**
 * YES24 상품 검색으로 카카오 미검증 후보의 ISBN·판매 상태를 확인한다.
 * 파이프라인 스크립트는 건드리지 않는다. 이 스크립트는 검증만 하며 DB를 쓰지 않는다.
 *
 * 용도 제한(affiliate-commerce.md): 카카오 미검증 후보(제목·저자는 있으나 ISBN 미확정)의
 * ISBN·판매중 확인용. 판정 대체 금지 — 등장 근거 심사는 기존 규칙 그대로이며,
 * 표지 수집·구매 연결은 기존 경로를 건드리지 않는다(cover는 기록만 한다).
 * 검색어 자동 교정 대응: 반환 제목·저자가 요청과 맞는지 대조한다(카카오 creatorHit 방식 준용).
 *
 * node --env-file=.env scripts/figure-books/yes24-verify-candidates.mjs --limit 3
 * node --env-file=.env scripts/figure-books/yes24-verify-candidates.mjs --out ../../data/celeb/figure-books/yes24-verify-2026-09-15.json
 *
 * 같은 --out으로 다시 실행하면 이미 검증된 (slug,title,creator)를 건너뛴다.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const YES24_URL = 'https://apis.yes24.com/v1/goods/itemList'

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

function argumentValues(name) {
  const results = []
  for (let index = 0; index < process.argv.length; index += 1) {
    const argument = process.argv[index]
    if (argument === `--${name}` && process.argv[index + 1]) { results.push(process.argv[index + 1]); index += 1; continue }
    if (argument.startsWith(`--${name}=`)) results.push(argument.slice(name.length + 3))
  }
  return results
}

// YES24 키는 web 서버 env에 있다(env-vars.md). 값은 로그에 찍지 않는다.
function envValue(key) {
  if (process.env[key]) return process.env[key]
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
  for (const file of ['sw/web/.env', 'sw/web-bo/.env']) {
    try {
      const text = readFileSync(join(root, file), 'utf8')
      const hit = text.split(/\r?\n/).find((line) => line.startsWith(`${key}=`))
      if (hit) return hit.slice(key.length + 1).trim().replace(/^["']|["']$/g, '')
    } catch { /* 없으면 다음 후보 */ }
  }
  return null
}

const yes24Key = envValue('YES24_API_KEY')
if (!yes24Key) throw new Error('YES24_API_KEY가 없습니다(sw/web/.env).')
const kakaoKey = process.env.KAKAO_REST_API_KEY ?? null

// appearance-muse-candidates.mjs와 같은 정규화·저자 분해다.
function normalize(value) {
  return (value ?? '').replace(/[\s·:;,()[\]{}"'`~!?.·「」『』<>-]/g, '').toLowerCase()
}

function creatorNames(value) {
  return (value ?? '')
    .replace(/\(.*?\)/g, ' ')
    .split(/[,;/]|\s외\s/)
    .map((part) => part.replace(/(지음|옮김|엮음|편저|편역|역주|주해|해설|글|그림|편|저|역)\s*$/g, '').trim())
    .map(normalize)
    .filter((part) => part.length >= 2)
}

function titleMatch(wanted, got) {
  const a = normalize(wanted)
  const b = normalize(got)
  if (a.length < 2 || b.length < 2) return false
  return a.includes(b) || b.includes(a)
}

async function yes24Search(title) {
  const params = new URLSearchParams({ query: title, category: 'BOOK', pageSize: '20' })
  const response = await fetch(`${YES24_URL}?${params}`, { headers: { 'X-Api-Key': yes24Key } })
  if (response.status === 429) return { items: null, error: 'rate_limited' }
  if (response.status === 404) return { items: [], error: null }
  if (!response.ok) return { items: null, error: `yes24_http_${response.status}` }
  const payload = await response.json()
  return { items: payload?.data?.items ?? [], error: null }
}

async function kakaoByIsbn(isbn) {
  if (!kakaoKey) return null
  const params = new URLSearchParams({ query: isbn, target: 'isbn' })
  const response = await fetch(`https://dapi.kakao.com/v3/search/book?${params}`, {
    headers: { Authorization: `KakaoAK ${kakaoKey}` },
  })
  if (!response.ok) return null
  const payload = await response.json()
  const hit = (payload.documents ?? []).find((d) => String(d.isbn ?? '').replace(/[\s-]/g, '').includes(isbn))
  return hit ?? null
}

function pickMatch(book, items) {
  const wantedCreators = creatorNames(book.creator)
  const wantedPublisher = normalize(book.publisher)
  const scored = []
  for (const item of items) {
    if (!titleMatch(book.title, item.title)) continue
    const authorFlat = normalize(item.author)
    const authorHit = wantedCreators.some((name) => authorFlat.includes(name) || (name.includes(authorFlat) && authorFlat.length >= 2))
    if (!authorHit) continue
    const publisherHit = wantedPublisher.length >= 2 && normalize(item.publisher).includes(wantedPublisher)
    scored.push({ item, publisherHit })
  }
  scored.sort((a, b) => Number(b.publisherHit) - Number(a.publisherHit))
  return scored[0] ?? null
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const ins = argumentValues('in')
  const inPaths = ins.length > 0 ? ins : [
    '../../data/celeb/figure-books/appearance-muse-2026-09-04.jsonl',
    '../../data/celeb/figure-books/appearance-muse-new-2026-09-07.jsonl',
  ]
  const ar01Path = resolve(process.cwd(), argumentValue('ar01', 'C:/Users/webco/AppData/Local/Temp/opencode/figbooks/ar01_ids.json'))
  const outPath = resolve(process.cwd(), argumentValue('out', '../../data/celeb/figure-books/yes24-verify-2026-09-15.json'))
  const limit = Number(argumentValue('limit', '0')) || 0
  const delayMs = Number(argumentValue('delay', '400')) || 0

  const ar01 = new Set(JSON.parse(readFileSync(ar01Path, 'utf8')))

  const prior = { verified: [], failed: [] }
  if (existsSync(outPath)) {
    try {
      const prev = JSON.parse(readFileSync(outPath, 'utf8'))
      prior.verified = prev.verified ?? []
      prior.failed = prev.failed ?? []
    } catch { /* 깨진 파일은 처음부터 */ }
  }
  const done = new Set([...prior.verified, ...prior.failed].map((r) => `${r.slug}\u0000${normalize(r.title)}\u0000${normalize(r.creator)}`))

  const targets = []
  for (const rel of inPaths) {
    const path = resolve(process.cwd(), rel)
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      if (!line.trim()) continue
      const row = JSON.parse(line)
      if (!ar01.has(row.person.id)) continue
      for (const book of row.books ?? []) {
        if (book.kakao?.isbn) continue
        const key = `${row.person.slug}\u0000${normalize(book.title)}\u0000${normalize(book.creator)}`
        if (done.has(key)) continue
        done.add(key)
        targets.push({ person: row.person, book })
      }
    }
  }
  const work = limit > 0 ? targets.slice(0, limit) : targets
  console.log(`대상 ${targets.length}건 / 이번 실행 ${work.length}건 (AR0~1 카카오 미검증)`)

  const verified = [...prior.verified]
  const failed = [...prior.failed]
  let consecutiveErrors = 0
  let consecutiveLimits = 0

  for (let i = 0; i < work.length; i += 1) {
    const { person, book } = work[i]
    const searched = await yes24Search(book.title)
    if (searched.error === 'rate_limited') {
      consecutiveLimits += 1
      if (consecutiveLimits >= 3) { console.log('YES24 429가 3회 연속 — 접는다.'); break }
      await sleep(60000)
      i -= 1
      continue
    }
    consecutiveLimits = 0
    if (searched.error) {
      consecutiveErrors += 1
      failed.push({ slug: person.slug, nickname: person.nickname, title: book.title, creator: book.creator, reason: searched.error })
      if (consecutiveErrors >= 10) { console.log('연속 오류 10건 — 접는다.'); break }
      continue
    }
    consecutiveErrors = 0
    const hit = pickMatch(book, searched.items)
    if (!hit || !hit.item.isbn13) {
      failed.push({
        slug: person.slug, nickname: person.nickname, title: book.title, creator: book.creator,
        reason: searched.items.length === 0 ? 'yes24_no_result' : (!hit ? 'yes24_title_author_mismatch' : 'yes24_no_isbn'),
        seen: (searched.items ?? []).slice(0, 3).map((it) => `${it.title} / ${it.author}`),
      })
    } else {
      const isbn13 = String(hit.item.isbn13).replace(/[\s-]/g, '')
      const kakaoDetail = await kakaoByIsbn(isbn13)
      verified.push({
        slug: person.slug, personId: person.id, nickname: person.nickname, score: person.score,
        title: book.title, creator: book.creator, publisher: book.publisher,
        evidenceUrl: book.evidenceUrl, scope: book.scope, kakaoReasonBefore: book.kakaoReason,
        isbn13,
        yes24: {
          title: hit.item.title, author: hit.item.author, publisher: hit.item.publisher,
          itemStatus: hit.item.itemStatus, itemId: hit.item.itemId, link: hit.item.link,
          match: hit.publisherHit ? 'title_author_publisher' : 'title_author',
        },
        kakaoIsbnDetail: kakaoDetail ? {
          title: kakaoDetail.title, authors: kakaoDetail.authors, publisher: kakaoDetail.publisher,
          isbn: kakaoDetail.isbn, status: kakaoDetail.status,
        } : null,
      })
    }
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${work.length} — 검증 ${verified.length} / 실패 ${failed.length}`)
    await sleep(delayMs)
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totals: { targets: targets.length, ran: work.length, verified: verified.length, failed: failed.length },
    verified,
    failed,
  }
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(`검증 ${verified.length}건 / 실패 ${failed.length}건`)
  const byStatus = {}
  for (const v of verified) byStatus[v.yes24.itemStatus ?? 'unknown'] = (byStatus[v.yes24.itemStatus ?? 'unknown'] ?? 0) + 1
  console.log('판매 상태:', JSON.stringify(byStatus))
  const withKakao = verified.filter((v) => v.kakaoIsbnDetail).length
  console.log(`카카오 ISBN 역조회 확인 ${withKakao}건 / YES24 전용 ${verified.length - withKakao}건`)
  console.log(`WROTE ${outPath}`)
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
