// 운영 서버(https://feelandnote.com)의 한영 인물·책장 도서 SSR 화면을 DB 저장값과 저비용으로 일괄 대조한다.
// 사용(저장소 루트): node scripts/browser/reading-way-web/verify-live.mjs slug1,slug2 [--books id1,id2] [--no-books] [--base URL] [--concurrency N] [--json] [--strict-books]
import { R } from './paths.mjs'

process.loadEnvFile(R + '/sw/web-bo/.env')
const DB_URL = process.env.NEXT_PUBLIC_DB_API_URL
const DB_KEY = process.env.DB_SECRET_KEY
if (!DB_URL || !DB_KEY) {
  console.error('ERROR missing NEXT_PUBLIC_DB_API_URL or DB_SECRET_KEY in sw/web-bo/.env')
  process.exit(2)
}

const DB_HEADERS = { apikey: DB_KEY, Authorization: `Bearer ${DB_KEY}` }
const UA = 'feelandnote-live-verify-fetch/1.0'

// ── CLI 파싱 ──
const argv = process.argv.slice(2)
let slugsArg = ''
let booksFilter = null
let noBooks = false
let baseUrl = 'https://feelandnote.com'
let concurrency = 6
let asJson = false
let strictBooks = false

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--no-books') noBooks = true
  else if (a === '--json') asJson = true
  else if (a === '--strict-books') strictBooks = true
  else if (a === '--books') booksFilter = new Set((argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean))
  else if (a.startsWith('--books=')) booksFilter = new Set(a.slice(8).split(',').map((s) => s.trim()).filter(Boolean))
  else if (a === '--base') baseUrl = (argv[++i] || baseUrl).replace(/\/+$/, '')
  else if (a.startsWith('--base=')) baseUrl = a.slice(7).replace(/\/+$/, '')
  else if (a === '--concurrency') concurrency = Math.max(1, Number(argv[++i]) || 6)
  else if (a.startsWith('--concurrency=')) concurrency = Math.max(1, Number(a.slice(14)) || 6)
  else if (!a.startsWith('-') && !slugsArg) slugsArg = a
}

// 주의: 알미나 카나번(almina-herbert,-countess-of-carnarvon)처럼 슬러그 자체에 `,-`가 들어가는 경우가 있다.
const slugs = slugsArg
  ? slugsArg.split(/,(?!-)/).map((s) => s.trim()).filter(Boolean)
  : []

if (!slugs.length) {
  console.error('Usage: node scripts/browser/reading-way-web/verify-live.mjs slug1,slug2 [--books id1,id2] [--no-books] [--base URL] [--concurrency N] [--json] [--strict-books]')
  process.exit(2)
}

const t0 = Date.now()

// ── HTML / 텍스트 정규화 ──
const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  middot: '·',
}

function decodeEntities(s) {
  return String(s || '').replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z0-9]+);/g, (m, code) => {
    if (code[0] === '#') {
      const cp = code[1] === 'x' || code[1] === 'X'
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10)
      return Number.isFinite(cp) && cp > 0 ? String.fromCodePoint(cp) : m
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? m
  })
}

function htmlToVisibleText(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // 인라인 태그는 빈 문자열로 지워 스팬 뒤 조사가 떨어지지 않게 한다(예: <span>‘닥터 슬립’</span>에서).
      .replace(/<\/?(?:span|a|em|strong|b|i|u|mark|small|sub|sup|code|abbr|cite|q)\b[^>]*>/gi, '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

function canonText(s) {
  return String(s || '')
    .replace(/[『《]/g, '《')
    .replace(/[』》]/g, '》')
    .replace(/[「」〈〉‘’']/g, "'")
    .replace(/[“”"]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractHtmlSearchable(html) {
  const vis = htmlToVisibleText(html)
  const alts = [...String(html || '').matchAll(/\balt="([^"]*)"/gi)].map((m) => decodeEntities(m[1]))
  const hrefs = [...String(html || '').matchAll(/\/content\/[0-9a-f-]{36}/gi)].map((m) => m[0])
  const jsonLds = [...String(html || '').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => decodeEntities(m[1]))
  return canonText([vis, ...alts, ...hrefs, ...jsonLds].join(' '))
}

function diffExcerpt(dbStr, liveStr) {
  let k = 0
  const max = Math.min(dbStr.length, liveStr.length)
  while (k < max && dbStr[k] === liveStr[k]) k++
  const start = Math.max(0, k - 15)
  return {
    pos: k,
    db: dbStr.slice(start, start + 50),
    live: liveStr.slice(start, start + 50),
  }
}

// ── 동시성·네트워크·DB 도우미 ──
async function mapPool(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++
      results[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return results
}

async function dbGet(path, headers = DB_HEADERS) {
  const r = await fetch(`${DB_URL}/rest/v1/${path}`, { headers })
  if (!r.ok) throw new Error(`DB HTTP ${r.status} for ${path}: ${(await r.text()).slice(0, 200)}`)
  return { data: await r.json(), contentRange: r.headers.get('content-range') }
}

const pageCache = new Map()
async function fetchPage(url) {
  if (pageCache.has(url)) return pageCache.get(url)
  const p = (async () => {
    let lastErr = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(url, {
          headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
          redirect: 'follow',
          signal: AbortSignal.timeout(30000),
        })
        const html = await r.text()
        if (r.status >= 500 && attempt === 0) continue
        return { status: r.status, finalUrl: r.url, html }
      } catch (e) {
        lastErr = e
      }
    }
    return { status: 0, finalUrl: url, html: '', error: String(lastErr?.message || lastErr) }
  })()
  pageCache.set(url, p)
  return p
}

const reviewCountCache = new Map()
async function getReviewCount(contentId, col) {
  const key = `${contentId}:${col}`
  if (reviewCountCache.has(key)) return reviewCountCache.get(key)
  const p = (async () => {
    const r = await fetch(
      `${DB_URL}/rest/v1/celeb_contents?content_id=eq.${contentId}&${col}=not.is.null&${col}=neq.&select=celeb_id`,
      { headers: { ...DB_HEADERS, Prefer: 'count=exact', Range: '0-0' } },
    )
    const cr = r.headers.get('content-range') || ''
    const total = Number(cr.split('/')[1])
    return Number.isFinite(total) ? total : null
  })()
  reviewCountCache.set(key, p)
  return p
}

// ── 1. DB 조회 ──
const slugIn = slugs.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(',')
const { data: celebRows } = await dbGet(
  `celebs?slug=in.(${encodeURIComponent(slugIn)})&select=id,slug,nickname,nickname_en,publication_status,celeb_reality,celeb_tier,reading_way,reading_way_en`,
)
const celebBySlug = new Map(celebRows.map((c) => [c.slug, c]))
const celebIds = celebRows.map((c) => c.id)

const booksByCelebId = new Map()
const allBookIds = new Set()
if (celebIds.length) {
  const idIn = celebIds.map((id) => `"${id}"`).join(',')
  const { data: ccRows } = await dbGet(
    `celeb_contents?celeb_id=in.(${encodeURIComponent(idIn)})&select=celeb_id,content_id,status,review,review_en,contents!inner(id,type,content_locales(locale,title,creator,publisher,isbn,verified))`,
  )
  for (const row of ccRows) {
    if (row.contents?.type !== 'BOOK') continue
    allBookIds.add(row.content_id)
    if (!booksByCelebId.has(row.celeb_id)) booksByCelebId.set(row.celeb_id, [])
    const locMap = Object.fromEntries((row.contents.content_locales || []).map((l) => [l.locale, l]))
    booksByCelebId.get(row.celeb_id).push({
      id: row.content_id,
      status: row.status,
      review: row.review || '',
      review_en: row.review_en || '',
      locales: locMap,
    })
  }
}

const editionsByBookId = new Map()
if (!noBooks && allBookIds.size > 0) {
  const bidIn = [...allBookIds].map((id) => `"${id}"`).join(',')
  const { data: edRows } = await dbGet(
    `figure_book_editions?content_id=in.(${encodeURIComponent(bidIn)})&select=content_id,locale,title,publisher,isbn,verified`,
  )
  for (const ed of edRows) {
    if (!editionsByBookId.has(ed.content_id)) editionsByBookId.set(ed.content_id, [])
    editionsByBookId.get(ed.content_id).push(ed)
  }
}

// ── 2. 인물 화면 및 도서 상세 페이지 병렬 조회 ──
const celebUrls = []
for (const slug of slugs) {
  if (!celebBySlug.has(slug)) continue
  const enc = encodeURIComponent(slug)
  celebUrls.push(`${baseUrl}/celeb/${enc}`, `${baseUrl}/en/celeb/${enc}`)
}

const uniqueBookIds = new Set()
if (!noBooks) {
  for (const c of celebRows) {
    for (const b of booksByCelebId.get(c.id) || []) {
      if (!booksFilter || booksFilter.has(b.id)) uniqueBookIds.add(b.id)
    }
  }
}
const bookUrls = []
for (const bid of uniqueBookIds) {
  bookUrls.push(`${baseUrl}/content/${bid}?category=book`, `${baseUrl}/en/content/${bid}?category=book`)
}

await mapPool([...celebUrls, ...bookUrls], concurrency, (u) => fetchPage(u))

// ── 3. 검증 ──
function checkReadingWay(html, dbRw, reality) {
  const expected = (reality === 'REAL' || reality === 'BOTH') && Boolean(dbRw?.trim())
  const secMatch = html.match(/<section\b[^>]*\bid=["']?reading-way["']?[^>]*>([\s\S]*?)<\/section>/i)
  const hasId = Boolean(secMatch) || /\bid=["']?reading-way["']?/i.test(html)

  if (!expected) {
    if (hasId) return { ok: false, tag: 'hidden', issues: ['RW_LEAK'] }
    return { ok: true, tag: 'hidden', issues: [] }
  }

  if (!secMatch) {
    return { ok: false, tag: 'MISSING', issues: ['RW_MISSING'] }
  }

  const secHtml = secMatch[1]
  const liveParas = [...secHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1])
  const dbParas = dbRw.trim().split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean)
  const charLen = [...dbRw.trim()].length
  const tag = `${charLen}c,${dbParas.length}p`
  const issues = []

  if (liveParas.length !== dbParas.length) {
    issues.push(`RW_PARA_COUNT(live=${liveParas.length},db=${dbParas.length})`)
  }
  const n = Math.min(liveParas.length, dbParas.length)
  for (let i = 0; i < n; i++) {
    const liveNorm = canonText(htmlToVisibleText(liveParas[i]))
    const dbNorm = canonText(dbParas[i])
    if (liveNorm !== dbNorm) {
      const ex = diffExcerpt(dbNorm, liveNorm)
      issues.push(`RW_STALE(p${i + 1}@${ex.pos}: db="${ex.db}" live="${ex.live}")`)
    }
  }
  return { ok: issues.length === 0, tag, issues }
}

const celebResults = []
let totalFail = 0
let totalPaginated = 0

for (const slug of slugs) {
  const c = celebBySlug.get(slug)
  if (!c) {
    totalFail++
    celebResults.push({ slug, ok: false, issues: ['DB_NOT_FOUND'] })
    continue
  }

  const enc = encodeURIComponent(slug)
  const koPage = await fetchPage(`${baseUrl}/celeb/${enc}`)
  const enPage = await fetchPage(`${baseUrl}/en/celeb/${enc}`)
  const issues = []
  const notes = []

  if (c.publication_status !== 'active') {
    if (koPage.status === 200 || enPage.status === 200) {
      issues.push(`INACTIVE_VISIBLE(status=${c.publication_status},ko=${koPage.status},en=${enPage.status})`)
    } else {
      notes.push(`INACTIVE(${c.publication_status},ko=${koPage.status},en=${enPage.status})`)
    }
  } else {
    if (koPage.status !== 200) issues.push(`KO_HTTP_${koPage.status}${koPage.error ? ':' + koPage.error : ''}`)
    if (enPage.status !== 200) issues.push(`EN_HTTP_${enPage.status}${enPage.error ? ':' + enPage.error : ''}`)
  }

  let koRw = { ok: true, tag: 'skip', issues: [] }
  let enRw = { ok: true, tag: 'skip', issues: [] }
  if (koPage.status === 200) {
    koRw = checkReadingWay(koPage.html, c.reading_way, c.celeb_reality)
    for (const iss of koRw.issues) issues.push(`ko:${iss}`)
  }
  if (enPage.status === 200) {
    enRw = checkReadingWay(enPage.html, c.reading_way_en, c.celeb_reality)
    for (const iss of enRw.issues) issues.push(`en:${iss}`)
  }

  const books = booksByCelebId.get(c.id) || []
  const shelfTotal = books.length
  let shelfKoFound = 0
  let shelfEnFound = 0
  if (shelfTotal > 0 && c.publication_status === 'active') {
    const koSearch = koPage.status === 200 ? extractHtmlSearchable(koPage.html) : ''
    const enSearch = enPage.status === 200 ? extractHtmlSearchable(enPage.html) : ''
    let koMissing = []
    let enMissing = []
    for (const b of books) {
      const koTitle = canonText(b.locales.ko?.title || b.locales.en?.title || '')
      const enTitle = canonText(b.locales.en?.title || b.locales.ko?.title || '')
      const koHit = (koPage.html.includes(`/content/${b.id}`)) || (koTitle && koSearch.includes(koTitle))
      const enHit = (enPage.html.includes(`/content/${b.id}`)) || (enTitle && enSearch.includes(enTitle))
      if (koHit) shelfKoFound++
      else koMissing.push({ b, title: koTitle })
      if (enHit) shelfEnFound++
      else enMissing.push({ b, title: enTitle })
    }
    if (shelfTotal > 20) {
      for (const [locPrefix, missingList, incFound] of [
        ['', koMissing, () => { shelfKoFound++ }],
        ['en/', enMissing, () => { shelfEnFound++ }],
      ]) {
        for (let p = 2; missingList.length > 0 && p <= 20; p++) {
          const recPage = await fetchPage(`${baseUrl}/${locPrefix}celeb/${enc}/records/${p}`)
          if (recPage.status !== 200) break
          const recSearch = extractHtmlSearchable(recPage.html)
          for (let i = missingList.length - 1; i >= 0; i--) {
            const { b, title } = missingList[i]
            if (recPage.html.includes(`/content/${b.id}`) || (title && recSearch.includes(title))) {
              incFound()
              missingList.splice(i, 1)
            }
          }
        }
      }
    }
    for (const { b, title } of koMissing) issues.push(`ko:SHELF_MISSING(${b.id.slice(0, 8)}:${title})`)
    for (const { b, title } of enMissing) issues.push(`en:SHELF_MISSING(${b.id.slice(0, 8)}:${title})`)
  }

  // 책 상세 페이지 검증
  const targetBooks = noBooks ? [] : books.filter((b) => !booksFilter || booksFilter.has(b.id))
  let koBookPass = 0
  let enBookPass = 0
  for (const b of targetBooks) {
    for (const loc of ['ko', 'en']) {
      const page = await fetchPage(`${baseUrl}/${loc === 'en' ? 'en/' : ''}content/${b.id}?category=book`)
      const bIssues = []
      if (page.status !== 200) {
        bIssues.push(`HTTP_${page.status}${page.error ? ':' + page.error : ''}`)
      } else {
        const vis = canonText(htmlToVisibleText(page.html))
        const locMeta = b.locales[loc]
        const edsAll = (editionsByBookId.get(b.id) || []).filter((e) => e.verified !== false)
        const edsLoc = edsAll.filter((e) => e.locale === loc)
        const matchMeta = (m) => {
          if (!m) return false
          if (m.title && !vis.includes(canonText(m.title))) return false
          if (m.publisher && !vis.includes(canonText(m.publisher))) return false
          if (m.isbn && !vis.includes(canonText(m.isbn))) return false
          return true
        }
        if (edsLoc.length > 0) {
          if (!edsLoc.some(matchMeta) && !matchMeta(locMeta)) {
            bIssues.push(`BOOK_EDITION_MISMATCH(loc=${loc},eds=${edsLoc.length})`)
          }
        } else if (edsAll.length > 0) {
          if (!matchMeta(locMeta) && !edsAll.some(matchMeta)) {
            bIssues.push(`BOOK_FALLBACK_EDITION_MISMATCH(loc=${loc})`)
          }
        } else if (locMeta) {
          if (locMeta.title && !vis.includes(canonText(locMeta.title))) bIssues.push(`BOOK_TITLE_MISSING(${locMeta.title})`)
          if (locMeta.publisher && !vis.includes(canonText(locMeta.publisher))) bIssues.push(`BOOK_PUB_MISSING(${locMeta.publisher})`)
          if (locMeta.isbn && !vis.includes(canonText(locMeta.isbn))) bIssues.push(`BOOK_ISBN_MISSING(${locMeta.isbn})`)
        }
        const rev = loc === 'en' ? b.review_en : b.review
        if (rev?.trim()) {
          const revNorm = canonText(rev)
          if (!vis.includes(revNorm)) {
            const nick = canonText(loc === 'en' ? (c.nickname_en || c.nickname) : c.nickname)
            const nickOnPage = nick ? vis.includes(nick) : false
            const col = loc === 'en' ? 'review_en' : 'review'
            const totalRev = await getReviewCount(b.id, col)
            if (totalRev !== null && totalRev > 10 && !nickOnPage) {
              totalPaginated++
              const msg = `${loc}:book:${b.id.slice(0, 8)}:PAGINATED(total=${totalRev})`
              if (strictBooks) bIssues.push(msg)
              else notes.push(msg)
            } else {
              bIssues.push(nickOnPage ? `REVIEW_STALE` : `REVIEW_MISSING`)
            }
          }
        }
      }
      if (bIssues.length === 0) {
        if (loc === 'ko') koBookPass++
        else enBookPass++
      } else {
        for (const bi of bIssues) issues.push(`${loc}:book:${b.id.slice(0, 8)}:${bi}`)
      }
    }
  }

  const ok = issues.length === 0
  if (!ok) totalFail++
  celebResults.push({
    slug,
    ok,
    status: c.publication_status,
    koRw: koRw.tag,
    enRw: enRw.tag,
    shelfTotal,
    shelfKoFound,
    shelfEnFound,
    bookTotal: targetBooks.length,
    koBookPass,
    enBookPass,
    issues,
    notes,
  })
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
const summary = {
  total: celebResults.length,
  pass: celebResults.filter((r) => r.ok).length,
  fail: totalFail,
  paginated: totalPaginated,
  elapsedSec: Number(elapsed),
}

if (asJson) {
  console.log(JSON.stringify({ summary, results: celebResults }))
} else {
  for (const r of celebResults) {
    if (r.issues?.includes('DB_NOT_FOUND')) {
      console.log(`FAIL ${r.slug} DB_NOT_FOUND`)
      continue
    }
    const shelfStr = r.shelfTotal === 0 ? '0/0' : `${r.shelfKoFound}/${r.shelfTotal},${r.shelfEnFound}/${r.shelfTotal}`
    const bookStr = noBooks
      ? 'skip'
      : r.bookTotal === 0
        ? '0'
        : `ko(${r.koBookPass}/${r.bookTotal}) en(${r.enBookPass}/${r.bookTotal})`
    console.log(
      `${r.ok ? 'PASS' : 'FAIL'} ${r.slug} [${r.status}] ko:rw(${r.koRw}) en:rw(${r.enRw}) shelf:${shelfStr} books:${bookStr}`,
    )
    for (const n of r.notes) console.log(`  INFO ${n}`)
    for (const iss of r.issues) console.log(`  FAIL ${iss}`)
  }
  console.log(`SUMMARY total=${summary.total} pass=${summary.pass} fail=${summary.fail} paginated=${summary.paginated} elapsed=${elapsed}s`)
}

process.exit(totalFail > 0 ? 1 : 0)
