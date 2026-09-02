import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../../..')
const require = createRequire(path.join(REPO, 'sw/web/package.json'))
const { createClient } = require('@supabase/supabase-js')

function usage() {
  console.log(`사용:
  node audit.mjs [--fiction-sources] [--evidence <선정.json>] [--output <결과.json>]
  node audit.mjs --all-books --evidence <선정.json> [--output <결과.json>]`)
}

function parseArgs(argv) {
  const options = {
    scope: 'fiction-sources',
    evidencePath: null,
    outputPath: null,
  }
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--fiction-sources') options.scope = 'fiction-sources'
    else if (arg === '--all-books') options.scope = 'all-books'
    else if (arg === '--evidence') options.evidencePath = argv[++index] ?? null
    else if (arg === '--output') options.outputPath = argv[++index] ?? null
    else if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    } else {
      throw new Error(`알 수 없는 인자: ${arg}`)
    }
  }
  return options
}

function envValue(source, key) {
  const match = source.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null
}

function resolveInputPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value)
}

function productIdentity(raw, field) {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${field}: 올바른 URL이 아닙니다.`)
  }
  if (url.protocol !== 'https:' || !/(^|\.)coupang\.com$/i.test(url.hostname)) {
    throw new Error(`${field}: 쿠팡 HTTPS URL이 아닙니다.`)
  }
  const productId = url.pathname.match(/\/vp\/products\/(\d+)/)?.[1] ?? ''
  if (!productId) throw new Error(`${field}: productId를 찾을 수 없습니다.`)
  return { productId, url: url.toString() }
}

function evidenceKey(contentId, isbn) {
  return `${contentId}:${String(isbn ?? '').replace(/[\s-]/g, '')}`
}

function loadEvidence(rawPath) {
  if (!rawPath) return new Map()
  const evidencePath = resolveInputPath(rawPath)
  const document = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
  const items = Array.isArray(document) ? document : document?.items
  if (!Array.isArray(items)) throw new Error('선정 자료는 배열 또는 items 배열을 가진 객체여야 합니다.')

  const byEdition = new Map()
  for (const [index, item] of items.entries()) {
    const label = `선정 자료[${index}]`
    if (typeof item?.content_id !== 'string' || !item.content_id.trim()) {
      throw new Error(`${label}: content_id가 필요합니다.`)
    }
    if (typeof item.isbn !== 'string' || !item.isbn.trim()) throw new Error(`${label}: isbn이 필요합니다.`)
    const key = evidenceKey(item.content_id, item.isbn)
    if (byEdition.has(key)) throw new Error(`${label}: content_id와 isbn 조합이 중복됩니다.`)
    if (typeof item.productId !== 'string' || !/^\d+$/.test(item.productId)) {
      throw new Error(`${label}: productId가 필요합니다.`)
    }
    const identity = productIdentity(item.productUrl, `${label} productUrl`)
    if (identity.productId !== item.productId) {
      throw new Error(`${label}: productId와 productUrl이 다릅니다.`)
    }
    if (!Array.isArray(item.qualityEvidence)
      || !item.qualityEvidence.some((value) => typeof value === 'string' && value.trim())) {
      throw new Error(`${label}: qualityEvidence가 필요합니다.`)
    }
    if (!item.qualityEvidence.some((value) => (
      typeof value === 'string'
      && /badge|배지|뱃지|로켓\s*배송|도착\s*보장/i.test(value)
    ))) {
      throw new Error(`${label}: 로켓배송·도착 보장 같은 배송 배지 근거가 필요합니다.`)
    }
    if (!['linked', 'pending_short_link'].includes(item.state)) {
      throw new Error(`${label}: state는 linked 또는 pending_short_link여야 합니다.`)
    }
    if (item.state === 'linked' && !isPartnerShortUrl(item.affiliateUrl)) {
      throw new Error(`${label}: linked 항목에는 affiliateUrl 파트너스 단축 주소가 필요합니다.`)
    }
    byEdition.set(key, item)
  }
  return byEdition
}

async function paged(queryFactory) {
  const pageSize = 1000
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if ((data ?? []).length < pageSize) return rows
  }
}

function coupangLinks(value) {
  if (!Array.isArray(value)) return []
  return value.filter((link) => (
    link
    && typeof link === 'object'
    && link.platform === 'coupang'
    && typeof link.url === 'string'
    && link.url.trim()
  )).map((link) => link.url.trim())
}

function isPartnerShortUrl(raw) {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:'
      && url.hostname === 'link.coupang.com'
      && /^\/a\/[A-Za-z0-9]+\/?$/.test(url.pathname)
      && !url.search
      && !url.hash
  } catch {
    return false
  }
}

async function followPartnerLink(raw) {
  let lastError = null
  for (const method of ['HEAD', 'GET']) {
    try {
      const response = await fetch(raw, {
        method,
        redirect: 'follow',
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; FeelAndNoteAffiliateAudit/1.0)' },
        signal: AbortSignal.timeout(15_000),
      })
      const finalUrl = response.url
      if (response.body) await response.body.cancel()
      const productId = new URL(finalUrl).pathname.match(/\/vp\/products\/(\d+)/)?.[1] ?? null
      if (productId) return { productId, finalUrl, httpStatus: response.status }
      lastError = new Error(`최종 URL에서 productId를 찾을 수 없습니다: ${finalUrl}`)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('단축 링크를 확인할 수 없습니다.')
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length)
  let cursor = 0
  async function worker() {
    for (;;) {
      const index = cursor++
      if (index >= values.length) return
      results[index] = await mapper(values[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker))
  return results
}

const options = parseArgs(process.argv.slice(2))
const evidenceByEdition = loadEvidence(options.evidencePath)
const envPath = path.join(REPO, 'sw/web/.env')
const env = fs.readFileSync(envPath, 'utf8')
const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL ?? envValue(env, 'NEXT_PUBLIC_DB_API_URL'),
  process.env.DB_SECRET_KEY ?? envValue(env, 'DB_SECRET_KEY'),
)

let catalogRows
if (options.scope === 'fiction-sources') {
  const [editions, products] = await Promise.all([
    paged(() => db
      .from('fiction_source_editions')
      .select('id,content_id,title,creator,publisher,isbn,sort_order')
      .eq('locale', 'ko')
      .order('content_id')
      .order('sort_order')
      .order('id')),
    paged(() => db
      .from('fiction_source_products')
      .select('edition_id,product_id,product_url,affiliate_url,quality_evidence,checked_at')
      .eq('platform', 'coupang')
      .eq('is_active', true)
      .order('edition_id')),
  ])
  const productByEdition = new Map(products.map((product) => [product.edition_id, product]))
  catalogRows = editions.map((edition) => {
    const product = productByEdition.get(edition.id) ?? null
    return {
      edition_id: edition.id,
      content_id: edition.content_id,
      title: edition.title,
      isbn: edition.isbn,
      links: product ? [product.affiliate_url] : [],
      storedProductId: product?.product_id ?? null,
      storedProductUrl: product?.product_url ?? null,
      storedQualityEvidence: product?.quality_evidence ?? null,
      checkedAt: product?.checked_at ?? null,
      sourceCatalog: true,
    }
  })
} else {
  const localeRows = await paged(() => db
    .from('content_locales')
    .select('content_id,title,creator,publisher,isbn,affiliate_url,contents!inner(type)')
    .eq('locale', 'ko')
    .eq('contents.type', 'BOOK')
    .order('content_id'))
  catalogRows = localeRows.map((locale) => ({
    edition_id: null,
    content_id: locale.content_id,
    title: locale.title,
    isbn: locale.isbn,
    links: coupangLinks(locale.affiliate_url),
    storedProductId: null,
    storedProductUrl: null,
    storedQualityEvidence: null,
    checkedAt: null,
    sourceCatalog: false,
  }))
}

const pendingRedirects = []
const seenEvidenceKeys = new Set()
const rows = catalogRows.map((catalog) => {
  const key = evidenceKey(catalog.content_id, catalog.isbn)
  const evidence = evidenceByEdition.get(key) ?? null
  if (evidence) seenEvidenceKeys.add(key)
  const links = catalog.links
  const row = {
    edition_id: catalog.edition_id,
    content_id: catalog.content_id,
    title: catalog.title,
    isbn: catalog.isbn,
    coupangUrl: links[0] ?? null,
    expectedProductId: evidence?.productId ?? null,
    redirectedProductId: null,
    finalUrl: null,
    httpStatus: null,
    status: 'no_link',
    issues: [],
  }

  if (links.length === 0) {
    if (evidence?.state === 'linked') {
      row.status = 'fail'
      row.issues.push('expected_link_missing')
    } else if (evidence?.state === 'pending_short_link') {
      row.status = 'pending_short_link'
    }
    return row
  }
  if (links.length > 1) row.issues.push('multiple_coupang_links')
  if (!evidence) row.issues.push('missing_evidence')
  if (evidence && String(catalog.isbn ?? '').replace(/[\s-]/g, '') !== String(evidence.isbn).replace(/[\s-]/g, '')) {
    row.issues.push('isbn_mismatch')
  }
  if (evidence?.state === 'linked' && links[0] !== evidence.affiliateUrl) {
    row.issues.push('affiliate_url_mismatch')
  }
  if (catalog.sourceCatalog && catalog.storedProductId !== evidence?.productId) {
    row.issues.push('stored_product_id_mismatch')
  }
  if (catalog.sourceCatalog && catalog.storedProductUrl !== evidence?.productUrl) {
    row.issues.push('stored_product_url_mismatch')
  }
  if (catalog.sourceCatalog && JSON.stringify(catalog.storedQualityEvidence) !== JSON.stringify(evidence?.qualityEvidence)) {
    row.issues.push('stored_quality_evidence_mismatch')
  }
  if (catalog.sourceCatalog && !catalog.checkedAt) row.issues.push('missing_checked_at')
  if (!isPartnerShortUrl(links[0])) row.issues.push('not_partner_short_url')
  if (row.issues.length > 0) {
    row.status = 'fail'
    return row
  }

  row.status = 'checking'
  pendingRedirects.push(row)
  return row
})

for (const [key, evidence] of evidenceByEdition) {
  if (seenEvidenceKeys.has(key)) continue
  rows.push({
    edition_id: null,
    content_id: evidence.content_id,
    title: evidence.label ?? evidence.content_id,
    isbn: evidence.isbn,
    coupangUrl: null,
    expectedProductId: evidence.productId,
    redirectedProductId: null,
    finalUrl: null,
    httpStatus: null,
    status: 'fail',
    issues: ['evidence_edition_missing'],
  })
}

await mapWithConcurrency(pendingRedirects, 6, async (row) => {
  try {
    const resolved = await followPartnerLink(row.coupangUrl)
    row.redirectedProductId = resolved.productId
    row.finalUrl = resolved.finalUrl
    row.httpStatus = resolved.httpStatus
    if (resolved.productId !== row.expectedProductId) row.issues.push('product_id_mismatch')
  } catch (error) {
    row.issues.push('redirect_unverified')
    row.redirectError = error instanceof Error ? error.message : String(error)
  }
  row.status = row.issues.length === 0 ? 'pass' : 'fail'
})

const summary = {
  scope: options.scope,
  rows: rows.length,
  linked: rows.filter((row) => row.coupangUrl).length,
  pass: rows.filter((row) => row.status === 'pass').length,
  fail: rows.filter((row) => row.status === 'fail').length,
  pendingShortLink: rows.filter((row) => row.status === 'pending_short_link').length,
  noLink: rows.filter((row) => row.status === 'no_link').length,
}
const report = {
  auditedAt: new Date().toISOString(),
  ...summary,
  rows,
}

console.log(JSON.stringify(summary, null, 2))
for (const row of rows.filter((item) => item.status === 'fail' || item.status === 'pending_short_link')) {
  console.log(`${row.status}: ${row.title ?? row.content_id} — ${row.issues.join(', ') || row.expectedProductId}`)
}

if (options.outputPath) {
  const outputPath = resolveInputPath(options.outputPath)
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`결과 저장: ${outputPath}`)
}
if (summary.fail > 0) process.exitCode = 1
