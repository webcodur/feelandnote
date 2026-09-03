/**
 * 기존 원전 작품 아래에 ISBN별 판본을 일괄 등록한다. 기본은 dry-run이다.
 * 한국어판 메타는 카카오, 영문판은 OpenLibrary에서만 가져온다.
 *
 * pnpm exec node --env-file=sw/web-bo/.env --import tsx sw/web-bo/scripts/fiction/source-edition-batch.ts --file <판본.json>
 */

import { readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { getBookByIsbnWithFullDescription } from '@feelandnote/content-search/kakao-books'

const DB_URL = process.env.NEXT_PUBLIC_DB_API_URL
const SERVICE_KEY = process.env.DB_SECRET_KEY
if (!DB_URL || !SERVICE_KEY) {
  throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY가 필요합니다.')
}

const db = createClient(DB_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const EDITION_KINDS = new Set([
  'full',
  'abridged',
  'retelling',
  'adaptation',
  'selection',
  'volume',
])
const LOOKUP_CONCURRENCY = 4

type Locale = 'ko' | 'en'
type Platform = 'coupang' | 'amazon'

type ProductInput = {
  platform: Platform
  productId: string
  productUrl: string
  affiliateUrl: string
  qualityEvidence: string[]
  checkedAt?: string
}

type EditionInput = {
  contentId: string
  locale: Locale
  isbn: string
  editionTitle?: string
  editionKind: string
  textScope: string
  sortOrder: number
  product?: ProductInput
}

type ResolvedEdition = EditionInput & {
  title: string
  creator: string | null
  description: string | null
  publisher: string | null
  thumbnailUrl: string | null
  releaseDate: string | null
  sources: unknown
}

type StoredEdition = {
  id: number
  content_id: string
  locale: string
  isbn: string | null
  title: string
}

function usage() {
  console.log(`사용:
  pnpm exec node --env-file=sw/web-bo/.env --import tsx sw/web-bo/scripts/fiction/source-edition-batch.ts --file <판본.json>
  위 명령 끝에 --apply를 붙이면 반영합니다.

판본.json은 객체 한 건 또는 객체 배열이다.
[{"contentId":"...","locale":"ko","isbn":"979...","editionTitle":"완역 특별판","editionKind":"full","textScope":"complete","sortOrder":0}]
editionTitle은 ISBN 상세에 있는 판본 수식어가 메타 정규화 과정에서 빠질 때만 쓴다.
상품은 선택 사항이며 product에 productId/productUrl/affiliateUrl/qualityEvidence를 함께 둔다.`)
}

function parseOptions() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    usage()
    process.exit(0)
  }
  const fileIndex = args.indexOf('--file')
  const file = fileIndex >= 0 ? args[fileIndex + 1] : null
  const allowed = new Set(['--file', '--apply'])
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]
    if (index === fileIndex + 1) continue
    if (!allowed.has(value)) throw new Error(`지원하지 않는 인자: ${value}`)
  }
  if (!file) throw new Error('--file <판본.json>이 필요합니다.')
  return {
    apply: args.includes('--apply'),
    file: isAbsolute(file) ? file : resolve(process.cwd(), file),
  }
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field}는 객체여야 합니다.`)
  }
  return value as Record<string, unknown>
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field}가 필요합니다.`)
  return value.trim()
}

function isbn(value: unknown, field: string): string {
  const normalized = text(value, field).replace(/[\s-]/g, '')
  if (!/^(?:97[89]\d{10}|\d{9}[\dXx])$/.test(normalized)) {
    throw new Error(`${field}는 ISBN-10 또는 ISBN-13이어야 합니다.`)
  }
  return normalized
}

function httpsUrl(value: unknown, field: string): string {
  const raw = text(value, field)
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${field}는 올바른 URL이어야 합니다.`)
  }
  if (url.protocol !== 'https:') throw new Error(`${field}는 HTTPS URL이어야 합니다.`)
  return raw
}

function parseProduct(value: unknown, locale: Locale, field: string): ProductInput | undefined {
  if (value === undefined) return undefined
  const raw = record(value, field)
  const platform = text(raw.platform, `${field}.platform`) as Platform
  const expectedPlatform = locale === 'ko' ? 'coupang' : 'amazon'
  if (platform !== expectedPlatform) {
    throw new Error(`${field}.platform은 ${locale} 판본에서 ${expectedPlatform}이어야 합니다.`)
  }
  const productId = text(raw.productId, `${field}.productId`)
  const productUrl = httpsUrl(raw.productUrl, `${field}.productUrl`)
  const affiliateUrl = httpsUrl(raw.affiliateUrl, `${field}.affiliateUrl`)
  if (!Array.isArray(raw.qualityEvidence)) throw new Error(`${field}.qualityEvidence는 배열이어야 합니다.`)
  const qualityEvidence = raw.qualityEvidence
    .map((item) => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean)
  if (qualityEvidence.length === 0) throw new Error(`${field}.qualityEvidence가 필요합니다.`)

  if (platform === 'coupang') {
    if (!/^\d+$/.test(productId)) throw new Error(`${field}.productId는 숫자여야 합니다.`)
    const urlProductId = new URL(productUrl).pathname.match(/\/vp\/products\/(\d+)/)?.[1]
    if (urlProductId !== productId) throw new Error(`${field}.productId와 productUrl이 다릅니다.`)
    if (!/^https:\/\/link\.coupang\.com\/a\/[A-Za-z0-9]+\/?$/.test(affiliateUrl)) {
      throw new Error(`${field}.affiliateUrl은 쿠팡 파트너스 단축 주소여야 합니다.`)
    }
    if (!qualityEvidence.some((item) => /badge|배지|뱃지|로켓\s*배송|도착\s*보장/i.test(item))) {
      throw new Error(`${field}.qualityEvidence에 배송 배지 근거가 필요합니다.`)
    }
  }

  return {
    platform,
    productId,
    productUrl,
    affiliateUrl,
    qualityEvidence,
    ...(raw.checkedAt === undefined
      ? {}
      : { checkedAt: text(raw.checkedAt, `${field}.checkedAt`) }),
  }
}

function parseInputs(document: unknown): EditionInput[] {
  const values = Array.isArray(document) ? document : [document]
  if (values.length === 0) throw new Error('판본 입력이 비어 있습니다.')
  const seen = new Set<string>()
  return values.map((value, index) => {
    const field = `items[${index}]`
    const raw = record(value, field)
    const locale = text(raw.locale, `${field}.locale`) as Locale
    if (locale !== 'ko' && locale !== 'en') throw new Error(`${field}.locale은 ko 또는 en이어야 합니다.`)
    const editionKind = text(raw.editionKind, `${field}.editionKind`)
    if (!EDITION_KINDS.has(editionKind)) throw new Error(`${field}.editionKind가 올바르지 않습니다.`)
    const textScope = text(raw.textScope, `${field}.textScope`)
    const sortOrder = raw.sortOrder === undefined ? 0 : Number(raw.sortOrder)
    if (!Number.isInteger(sortOrder) || sortOrder < 0) throw new Error(`${field}.sortOrder는 0 이상의 정수여야 합니다.`)
    const item: EditionInput = {
      contentId: text(raw.contentId, `${field}.contentId`),
      locale,
      isbn: isbn(raw.isbn, `${field}.isbn`),
      ...(raw.editionTitle === undefined
        ? {}
        : { editionTitle: text(raw.editionTitle, `${field}.editionTitle`) }),
      editionKind,
      textScope,
      sortOrder,
      product: parseProduct(raw.product, locale, `${field}.product`),
    }
    const key = `${item.contentId}:${item.locale}:${item.isbn}`
    if (seen.has(key)) throw new Error(`${field}: 같은 작품·언어·ISBN이 중복됩니다.`)
    seen.add(key)
    return item
  })
}

function exactDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  return match?.[0] ?? null
}

async function resolveOpenLibrary(input: EditionInput): Promise<ResolvedEdition> {
  const key = `ISBN:${input.isbn}`
  const url = new URL('https://openlibrary.org/api/books')
  url.searchParams.set('bibkeys', key)
  url.searchParams.set('jscmd', 'data')
  url.searchParams.set('format', 'json')
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) throw new Error(`${input.isbn}: OpenLibrary ${response.status}`)
  const document = await response.json() as Record<string, Record<string, unknown>>
  const book = document[key]
  if (!book) throw new Error(`${input.isbn}: OpenLibrary 판본을 찾을 수 없습니다.`)
  const names = (value: unknown) => Array.isArray(value)
    ? value.flatMap((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return []
        const name = (item as Record<string, unknown>).name
        return typeof name === 'string' && name.trim() ? [name.trim()] : []
      })
    : []
  const title = input.editionTitle ?? text(book.title, `${input.isbn}.title`)
  const creators = names(book.authors)
  const publishers = names(book.publishers)
  const cover = book.cover && typeof book.cover === 'object' && !Array.isArray(book.cover)
    ? (book.cover as Record<string, unknown>).large
      ?? (book.cover as Record<string, unknown>).medium
      ?? null
    : null
  return {
    ...input,
    title,
    creator: creators.join(', ') || null,
    description: null,
    publisher: publishers.join(', ') || null,
    thumbnailUrl: typeof cover === 'string' ? cover : null,
    releaseDate: exactDate(book.publish_date),
    sources: { primary: `https://openlibrary.org/isbn/${input.isbn}` },
  }
}

async function resolveEdition(input: EditionInput): Promise<ResolvedEdition> {
  if (input.locale === 'en') return resolveOpenLibrary(input)
  const lookup = await getBookByIsbnWithFullDescription(input.isbn)
  if (!lookup) throw new Error(`${input.isbn}: 카카오 판본을 찾을 수 없습니다.`)
  if (lookup.book.metadata.isbn.replace(/[\s-]/g, '') !== input.isbn) {
    throw new Error(`${input.isbn}: 카카오 응답 ISBN이 다릅니다.`)
  }
  return {
    ...input,
    title: input.editionTitle ?? lookup.book.title,
    creator: lookup.book.creator || null,
    description: lookup.fullDescription ?? lookup.book.metadata.description ?? null,
    publisher: lookup.book.metadata.publisher || null,
    thumbnailUrl: lookup.book.coverImageUrl,
    releaseDate: exactDate(lookup.book.metadata.publishDate),
    sources: {
      primary: lookup.book.metadata.link,
      ...(lookup.fullDescription ? { description: lookup.book.metadata.link } : {}),
    },
  }
}

async function concurrentMap<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length)
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const index = cursor++
      output[index] = await worker(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(LOOKUP_CONCURRENCY, items.length) }, run))
  return output
}

async function verifySourceWorks(inputs: EditionInput[]) {
  const ids = [...new Set(inputs.map((input) => input.contentId))]
  const { data, error } = await db
    .from('fiction_source_contents')
    .select('content_id')
    .in('content_id', ids)
  if (error) throw new Error(`원전 작품 조회 실패: ${error.message}`)
  const found = new Set((data ?? []).map((row) => row.content_id))
  const missing = ids.filter((id) => !found.has(id))
  if (missing.length > 0) throw new Error(`원전으로 지정되지 않은 작품: ${missing.join(', ')}`)
}

async function findStoredEdition(input: EditionInput): Promise<StoredEdition | null> {
  const { data, error } = await db
    .from('fiction_source_editions')
    .select('id,content_id,locale,isbn,title')
    .eq('content_id', input.contentId)
    .eq('locale', input.locale)
    .eq('isbn', input.isbn)
    .maybeSingle()
  if (error) throw new Error(`${input.isbn}: 기존 판본 조회 실패: ${error.message}`)
  return data as StoredEdition | null
}

async function insertEdition(input: ResolvedEdition): Promise<StoredEdition> {
  const { data, error } = await db
    .from('fiction_source_editions')
    .insert({
      content_id: input.contentId,
      locale: input.locale,
      title: input.title,
      creator: input.creator,
      description: input.description,
      isbn: input.isbn,
      publisher: input.publisher,
      thumbnail_url: input.thumbnailUrl,
      release_date: input.releaseDate,
      edition_kind: input.editionKind,
      text_scope: input.textScope,
      sort_order: input.sortOrder,
      verified: true,
      sources: input.sources,
    })
    .select('id,content_id,locale,isbn,title')
    .single()
  if (error) throw new Error(`${input.isbn}: 판본 등록 실패: ${error.message}`)
  return data as StoredEdition
}

async function updateEdition(id: number, input: ResolvedEdition): Promise<StoredEdition> {
  const { data, error } = await db
    .from('fiction_source_editions')
    .update({
      title: input.title,
      creator: input.creator,
      description: input.description,
      publisher: input.publisher,
      thumbnail_url: input.thumbnailUrl,
      release_date: input.releaseDate,
      edition_kind: input.editionKind,
      text_scope: input.textScope,
      sort_order: input.sortOrder,
      verified: true,
      sources: input.sources,
    })
    .eq('id', id)
    .eq('content_id', input.contentId)
    .eq('locale', input.locale)
    .eq('isbn', input.isbn)
    .select('id,content_id,locale,isbn,title')
    .single()
  if (error) throw new Error(`${input.isbn}: 판본 갱신 실패: ${error.message}`)
  return data as StoredEdition
}

async function replaceProduct(editionId: number, product: ProductInput) {
  const { error } = await db.rpc('replace_fiction_source_product', {
    p_edition_id: editionId,
    p_platform: product.platform,
    p_product_id: product.productId,
    p_product_url: product.productUrl,
    p_affiliate_url: product.affiliateUrl,
    p_quality_evidence: product.qualityEvidence,
    p_checked_at: product.checkedAt ?? new Date().toISOString(),
  })
  if (error) throw new Error(`판본 ${editionId} 상품 등록 실패: ${error.message}`)
}

async function main() {
  const options = parseOptions()
  const document = JSON.parse(readFileSync(options.file, 'utf8'))
  const inputs = parseInputs(document)
  await verifySourceWorks(inputs)
  const resolved = await concurrentMap(inputs, resolveEdition)
  const existing = await concurrentMap(inputs, findStoredEdition)

  const plan = resolved.map((edition, index) => ({
    action: existing[index] ? 'update' : 'insert',
    contentId: edition.contentId,
    locale: edition.locale,
    isbn: edition.isbn,
    title: edition.title,
    editionKind: edition.editionKind,
    textScope: edition.textScope,
    product: edition.product?.platform ?? null,
  }))
  console.log(JSON.stringify({ mode: options.apply ? 'apply' : 'dry-run', items: plan }, null, 2))
  if (!options.apply) return

  for (let index = 0; index < resolved.length; index += 1) {
    const target = resolved[index]
    const existingEdition = existing[index]
    const edition = existingEdition
      ? await updateEdition(existingEdition.id, target)
      : await insertEdition(target)
    const product = target.product
    if (product) await replaceProduct(edition.id, product)
    const readback = await findStoredEdition(target)
    if (!readback || readback.id !== edition.id) {
      throw new Error(`${target.isbn}: 판본 readback이 일치하지 않습니다.`)
    }
    console.log(`✔ ${readback.title} · edition:${readback.id}${product ? ' · product:active' : ''}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
