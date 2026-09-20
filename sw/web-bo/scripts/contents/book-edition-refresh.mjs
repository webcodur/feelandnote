/**
 * 절판·품절된 저장 ISBN을 판매중인 개정판 ISBN으로 전환한다. 기본 dry-run, `--apply`로 반영.
 *
 * 대상: content_locales(locale=ko, isbn 있음, sources.primary ≠ 'none')와
 * figure_book_editions(locale=ko, isbn 있음). 같은 ISBN을 공유하는 행은 함께 갱신한다.
 *
 * 절차:
 *  1) 고유 ISBN 전량을 YES24 itemDetail(detail=N)로 조회해 itemStatus를 캐시한다.
 *  2) `판매중`이 아닌 ISBN은 YES24 itemList 제목 검색으로 같은 작품의 판매중 판본을 찾는다.
 *     같은 작품 판정: 괄호·부제를 걷은 정규화 제목 일치 + 저자 겹침 + 세트·합본·해설류 배제.
 *     같은 출판사 우선, 그다음 최신 출간일. 카카오 ISBN 역조회로 제목·판매 상태를 재검증한다.
 *  3) --apply: ISBN·출판사·표지(thumbnail_url)를 새 판본으로 바꾸고 sources.availability 표식을 뺀다.
 *     같은 작품에 이미 같은 ISBN의 ko 판본 행이 있으면 그 행은 건너뛴다(dup_skip).
 *
 * 산출물(data/tmp/edition-refresh/):
 *  - status-cache.json      ISBN → YES24 판매 상태 캐시(재실행 시 이어서 돈다)
 *  - refresh-plan.json      전환 계획·불가 사유(dry-run 결과)
 *  - applied-backup.jsonl   반영 전후 원본(--apply 시에만)
 *
 * node --env-file=.env scripts/contents/book-edition-refresh.mjs [--limit N] [--apply]
 * node --env-file=.env scripts/contents/book-edition-refresh.mjs --apply --from-plan   저장된 refresh-plan.json만 반영(스캔·탐색 생략)
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { argumentValue, hasFlag, dbClient, allRows, bareIsbn, squash, kakaoByIsbn, sleep, MULTIPART } from '../figure-books/lib/figure-work.mjs'

const APPLY = hasFlag('apply')
const FROM_PLAN = hasFlag('from-plan')
const LIMIT = Number(argumentValue('limit', '0'))
const CONCURRENCY = Number(argumentValue('concurrency', '3'))
const OUT_DIR = resolve(process.cwd(), '../../data/tmp/edition-refresh')
const STATUS_CACHE = join(OUT_DIR, 'status-cache.json')
const PLAN_PATH = join(OUT_DIR, 'refresh-plan.json')
const BACKUP_PATH = join(OUT_DIR, 'applied-backup.jsonl')
const YES24_DETAIL = 'https://apis.yes24.com/v1/goods/itemDetail'
const YES24_LIST = 'https://apis.yes24.com/v1/goods/itemList'
const BOOK_TYPES = new Set(['도서', '국내도서', '만화'])

// YES24 키는 web 서버 env에 있다(env-vars.md). 값은 로그에 찍지 않는다.
function envValue(key) {
  if (process.env[key]) return process.env[key]
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
  for (const file of ['sw/web/.env', 'sw/web-bo/.env']) {
    try {
      const hit = readFileSync(join(root, file), 'utf8').split(/\r?\n/).find((line) => line.startsWith(`${key}=`))
      if (hit) return hit.slice(key.length + 1).trim().replace(/^["']|["']$/g, '')
    } catch { /* 없으면 다음 후보 */ }
  }
  return null
}
const yes24Key = envValue('YES24_API_KEY')
if (!yes24Key) throw new Error('YES24_API_KEY가 없습니다(sw/web/.env).')

// ── YES24 조회 ────────────────────────────────────────────────────────────
async function yes24Json(url) {
  const response = await fetch(url, { headers: { 'X-Api-Key': yes24Key }, signal: AbortSignal.timeout(20000) })
  if (response.status === 429) return { rateLimited: true }
  if (response.status === 404) return { items: [] }
  if (!response.ok) return { error: `yes24_http_${response.status}` }
  const payload = await response.json()
  if (payload?.success !== true || payload?.errorCode) return { error: `yes24_${payload?.errorCode ?? 'rejected'}` }
  return { items: payload?.data?.items ?? [] }
}

async function yes24Status(isbn) {
  const url = `${YES24_DETAIL}?${new URLSearchParams({ searchType: 'ISBN13', query: isbn, detail: 'N' })}`
  const res = await yes24Json(url)
  if (res.rateLimited || res.error) return res
  const item = res.items.find((row) => bareIsbn(row.isbn13) === isbn) ?? null
  return { status: item?.itemStatus ?? '', itemId: item?.itemId ?? null }
}

async function yes24Search(title) {
  const url = `${YES24_LIST}?${new URLSearchParams({ query: title, category: 'BOOK', pageSize: '20' })}`
  return yes24Json(url)
}

// ── 같은 작품 판정 ─────────────────────────────────────────────────────────
/** 괄호·부제(: 뒤)·시리즈 권차를 걷은 비교용 제목 */
function workTitle(value) {
  return squash(String(value ?? '').split(/[:：]/)[0])
}

function creatorNames(value) {
  return String(value ?? '')
    .replace(/\(.*?\)/g, ' ')
    .split(/[,;/]|\s외\s/)
    .map((part) => squash(part.replace(/(지음|옮김|엮음|편저|편역|역주|주해|해설|글|그림|편|저|역)\s*$/g, '')))
    .filter((part) => part.length >= 2)
}

function authorHit(storedCreator, itemAuthor) {
  const wanted = creatorNames(storedCreator)
  if (wanted.length === 0) return true // 저장 저자가 없으면 저자로 가르지 않는다
  const flat = squash(itemAuthor)
  return wanted.some((name) => flat.includes(name) || (flat.length >= 2 && name.includes(flat)))
}

// 세트·해설·요약·가이드류는 같은 작품이 아니다. 원본 제목에 있으면 그대로 둔다.
const DERIVATIVE = /(세트|전집|합본|박스|해설|요약|가이드|워크북|스터디|해제|평전|만화로|그래픽\s?노벨|챌린지|필사|수첩|다이어리|노트북|\+)/

function pickReplacement(stored, items) {
  const wanted = workTitle(stored.title)
  const storedDerivative = DERIVATIVE.test(String(stored.title))
  const candidates = []
  for (const item of items) {
    if (item.itemStatus !== '판매중') continue
    if (!BOOK_TYPES.has(String(item.goodsType))) continue
    const isbn = bareIsbn(item.isbn13)
    if (!/^97[89]\d{10}$/.test(isbn) || isbn === bareIsbn(stored.isbn)) continue
    if (!storedDerivative && (DERIVATIVE.test(String(item.title)) || MULTIPART.test(String(item.title)))) continue
    if (workTitle(item.title) !== wanted) continue
    if (!authorHit(stored.creator, item.author)) continue
    candidates.push(item)
  }
  const storedPublisher = squash(stored.publisher)
  candidates.sort((a, b) => {
    const pa = storedPublisher.length >= 2 && squash(a.publisher).includes(storedPublisher) ? 1 : 0
    const pb = storedPublisher.length >= 2 && squash(b.publisher).includes(storedPublisher) ? 1 : 0
    if (pa !== pb) return pb - pa
    return String(b.publishDate ?? '').localeCompare(String(a.publishDate ?? ''))
  })
  return candidates[0] ?? null
}

/** 카카오 썸네일 redirect에서 daum 원본 주소를 뽑는다. 없으면 null(기존 표지 유지) */
function kakaoCover(document) {
  const fname = /[?&]fname=([^&]+)/.exec(String(document?.thumbnail ?? ''))?.[1]
  if (!fname) return null
  try {
    const url = new URL(decodeURIComponent(fname))
    if (!url.hostname.endsWith('daumcdn.net')) return null
    url.protocol = 'https:'
    return url.href
  } catch { return null }
}

async function main() {
  const db = dbClient()
  const locales = await allRows('content_locales', (from, to) => db.from('content_locales')
    .select('content_id,title,creator,publisher,isbn,thumbnail_url,sources').eq('locale', 'ko').not('isbn', 'is', null).order('content_id').range(from, to))
  const editions = await allRows('figure_book_editions', (from, to) => db.from('figure_book_editions')
    .select('id,content_id,title,creator,publisher,isbn').eq('locale', 'ko').not('isbn', 'is', null).order('id').range(from, to))

  const localeRows = locales.filter((r) => r.sources?.primary !== 'none' && /^97[89]\d{10}$/.test(bareIsbn(r.isbn)))
  const editionRows = editions.filter((r) => /^97[89]\d{10}$/.test(bareIsbn(r.isbn)))
  const byIsbn = new Map()
  for (const r of localeRows) {
    const isbn = bareIsbn(r.isbn)
    const entry = byIsbn.get(isbn) ?? { locales: [], editions: [] }
    entry.locales.push(r); byIsbn.set(isbn, entry)
  }
  for (const r of editionRows) {
    const isbn = bareIsbn(r.isbn)
    const entry = byIsbn.get(isbn) ?? { locales: [], editions: [] }
    entry.editions.push(r); byIsbn.set(isbn, entry)
  }
  console.log(`ko ISBN 행: content_locales ${localeRows.length} / figure_book_editions ${editionRows.length} / 고유 ISBN ${byIsbn.size}`)

  let plan = []
  if (!FROM_PLAN) {
  // 1) 상태 스캔(캐시 이어달리기)
  const cache = existsSync(STATUS_CACHE) ? JSON.parse(readFileSync(STATUS_CACHE, 'utf8')) : {}
  let pending = [...byIsbn.keys()].filter((isbn) => !cache[isbn])
  if (LIMIT) pending = pending.slice(0, LIMIT)
  console.log(`상태 캐시 ${Object.keys(cache).length}건 / 이번 조회 ${pending.length}건 (동시 ${CONCURRENCY})`)
  mkdirSync(OUT_DIR, { recursive: true })

  let cursor = 0, done = 0
  const worker = async () => {
    while (cursor < pending.length) {
      const isbn = pending[cursor]; cursor += 1
      let res = await yes24Status(isbn)
      for (let retry = 0; (res.rateLimited || res.error) && retry < 4; retry += 1) {
        await sleep(res.rateLimited ? 60_000 : 2_000 * (retry + 1))
        res = await yes24Status(isbn)
      }
      cache[isbn] = res.rateLimited || res.error ? { error: res.rateLimited ? 'rate_limited' : res.error } : res
      done += 1
      if (done % 200 === 0) { writeFileSync(STATUS_CACHE, JSON.stringify(cache), 'utf8'); console.log(`  ${done}/${pending.length}`) }
      await sleep(300)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker))
  writeFileSync(STATUS_CACHE, JSON.stringify(cache), 'utf8')

  // 2) 전환 후보 탐색
  const bad = [...byIsbn.entries()].filter(([isbn]) => cache[isbn] && cache[isbn].status !== '판매중')
  console.log(`\n판매중 아님 ${bad.length} ISBN — 판매중 개정판 탐색`)
  let searched = 0
  for (const [isbn, entry] of bad) {
    if (cache[isbn].error) { plan.push({ isbn, reason: `status_${cache[isbn].error}`, contents: entry.locales.map((r) => r.content_id), editions: entry.editions.map((r) => r.id) }); continue }
    const stored = entry.locales[0] ?? entry.editions[0]
    let res = await yes24Search(stored.title)
    for (let retry = 0; (res.rateLimited || res.error) && retry < 4; retry += 1) {
      await sleep(res.rateLimited ? 60_000 : 2_000 * (retry + 1))
      res = await yes24Search(stored.title)
    }
    searched += 1
    await sleep(400)
    if (res.rateLimited || res.error) { plan.push({ isbn, title: stored.title, reason: `search_${res.rateLimited ? 'rate_limited' : res.error}` }); continue }
    const hit = pickReplacement(stored, res.items)
    if (!hit) {
      plan.push({ isbn, title: stored.title, creator: stored.creator, status: cache[isbn].status, reason: res.items.length === 0 ? 'no_result' : 'no_same_work_on_sale',
        seen: res.items.filter((i) => i.itemStatus === '판매중').slice(0, 3).map((i) => `${i.title} / ${i.author} / ${i.publisher}`) })
      continue
    }
    const newIsbn = bareIsbn(hit.isbn13)
    const kakao = await kakaoByIsbn(newIsbn)
    await sleep(110)
    if (!kakao) { plan.push({ isbn, title: stored.title, status: cache[isbn].status, reason: 'kakao_not_found', candidate: { isbn: newIsbn, title: hit.title } }); continue }
    // 카카오 제목은 「저자: 제목」·「시리즈: 제목」 형태가 섞인다 — 저장 작품명을 포함하는지로 본다
    const kakaoNorm = squash(kakao.title)
    const wanted = workTitle(stored.title)
    if (!(wanted.length >= 2 && (kakaoNorm.includes(wanted) || wanted.includes(kakaoNorm)))) { plan.push({ isbn, title: stored.title, status: cache[isbn].status, reason: 'kakao_title_mismatch', candidate: { isbn: newIsbn, title: hit.title, kakaoTitle: kakao.title } }); continue }
    if (/절판|품절/.test(String(kakao.status ?? ''))) { plan.push({ isbn, title: stored.title, status: cache[isbn].status, reason: `kakao_${kakao.status}`, candidate: { isbn: newIsbn, title: hit.title } }); continue }
    plan.push({ isbn, title: stored.title, creator: stored.creator, status: cache[isbn].status, reason: 'replace',
      contents: entry.locales.map((r) => r.content_id), editions: entry.editions.map((r) => r.id),
      replacement: { isbn: newIsbn, title: hit.title, author: hit.author, publisher: hit.publisher, itemId: hit.itemId,
        kakaoTitle: kakao.title, kakaoStatus: kakao.status ?? '', cover: kakaoCover(kakao) } })
    if (searched % 20 === 0) console.log(`  탐색 ${searched}/${bad.length}`)
  }

  writeFileSync(PLAN_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), plan }, null, 1), 'utf8')
  console.log(`WROTE ${PLAN_PATH}`)
  } else {
    plan = JSON.parse(readFileSync(PLAN_PATH, 'utf8')).plan ?? []
    console.log(`from-plan: ${plan.length}건을 읽었다(스캔·탐색 생략)`)
  }

  const replaceable = plan.filter((p) => p.reason === 'replace')
  console.log(`\n전환 확정 ${replaceable.length} / 전환 불가 ${plan.length - replaceable.length}`)
  if (!APPLY) { console.log('dry-run이다. 반영하려면 --apply를 붙인다.'); return }

  // 3) 반영 — 같은 ISBN을 공유하는 행을 함께 갱신한다
  const editionIsbnByContent = new Map()
  for (const r of editionRows) {
    const set = editionIsbnByContent.get(r.content_id) ?? new Set()
    set.add(bareIsbn(r.isbn)); editionIsbnByContent.set(r.content_id, set)
  }
  let updated = 0
  for (const p of replaceable) {
    const rep = p.replacement
    const patch = { isbn: rep.isbn }
    if (rep.publisher) patch.publisher = rep.publisher
    if (rep.cover) patch.thumbnail_url = rep.cover
    for (const contentId of p.contents ?? []) {
      const row = localeRows.find((r) => r.content_id === contentId)
      const sources = { ...(row?.sources ?? {}) }
      delete sources.availability
      const before = { isbn: p.isbn, publisher: row?.publisher ?? null, thumbnail_url: row?.thumbnail_url ?? null, availability: row?.sources?.availability ?? null }
      const u = await db.from('content_locales').update({ ...patch, sources }).eq('content_id', contentId).eq('locale', 'ko').eq('isbn', String(row?.isbn ?? p.isbn)).select('content_id')
      if (u.error) throw new Error(`content_locales ${contentId}: ${u.error.message}`)
      if ((u.data ?? []).length === 0) { console.log(`  miss content ${contentId} — 저장 isbn이 이미 다르다`); continue }
      appendFileSync(BACKUP_PATH, `${JSON.stringify({ at: new Date().toISOString(), table: 'content_locales', content_id: contentId, before, after: { ...patch, sources } })}\n`, 'utf8')
      updated += u.data.length
    }
    for (const editionId of p.editions ?? []) {
      const row = editionRows.find((r) => r.id === editionId)
      if (!row) continue
      const siblings = editionIsbnByContent.get(row.content_id) ?? new Set()
      if (siblings.has(rep.isbn)) { console.log(`  dup_skip edition ${editionId} — 같은 작품에 ${rep.isbn} 판본이 이미 있다`); continue }
      const before = { isbn: row.isbn, publisher: row.publisher, thumbnail_url: row.thumbnail_url }
      const u = await db.from('figure_book_editions').update(patch).eq('id', editionId).eq('isbn', String(row.isbn)).select('id')
      if (u.error) throw new Error(`figure_book_editions ${editionId}: ${u.error.message}`)
      if ((u.data ?? []).length === 0) { console.log(`  miss edition ${editionId} — 저장 isbn이 이미 다르다`); continue }
      siblings.delete(p.isbn); siblings.add(rep.isbn)
      appendFileSync(BACKUP_PATH, `${JSON.stringify({ at: new Date().toISOString(), table: 'figure_book_editions', id: editionId, content_id: row.content_id, before, after: patch })}\n`, 'utf8')
      updated += u.data.length
    }
  }
  console.log(`\n반영 완료 — 갱신 행 ${updated} / 백업 ${BACKUP_PATH}`)
  const touched = replaceable.flatMap((p) => p.contents ?? [])
  writeFileSync(join(OUT_DIR, 'touched-contents.json'), JSON.stringify([...new Set(touched)]), 'utf8')
}
main().catch((e) => { console.error(e); process.exit(1) })
