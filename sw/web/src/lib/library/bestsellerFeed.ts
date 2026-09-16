import type { BestsellerItem } from '@/actions/library/types'
import { productUrl as yes24ProductUrl, YES24_BOOK_GOODS_TYPES } from '../books/yes24Purchase'

export const APPLE_BOOKS_FEED_URL = 'https://rss.marketingtools.apple.com/api/v2/us/books/top-paid/20/books.json'
export const CHART_CACHE_SECONDS = { ko: 24 * 3600, en: 3600 } as const
export const CHART_MAX_AGE_MS = 48 * 3600_000
const MAX_BYTES = 1_000_000
const LIMIT = 20
type JsonObject = { [key: string]: unknown }
export interface BookChart {
  items: BestsellerItem[]
  updatedAt: string
  fetchedAt: string
  basisDate?: string
  sources: { name: string; url: string }[]
}
export interface BookChartSelection extends Omit<BookChart, 'fetchedAt'> {
  isStale: boolean
  status: 'ready' | 'unavailable'
}
const sources = {
  ko: [{ name: 'YES24', url: 'https://www.yes24.com/product/category/daybestseller?categoryNumber=001' }],
  en: [{ name: 'Apple Books · US', url: 'https://books.apple.com/us/charts/top-paid' }],
}
const object = (value: unknown): JsonObject => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid chart object')
  return value as JsonObject
}
const text = (value: unknown, limit = 1000): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error('Invalid chart text')
  return value.trim()
}
function safeUrl(value: unknown, allowed: (url: URL) => boolean): string {
  const url = new URL(text(value, 2048))
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed(url)) throw new Error('Invalid chart URL')
  return url.href
}
function coverUrl(value: unknown, allowed: (url: URL) => boolean): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Invalid chart URL')
  return allowed(url) ? safeUrl(value, allowed) : null
}
const creator = (value: unknown): string => typeof value === 'string' && value.trim() ? text(value) : ''
function appleCover(value: unknown): string | null {
  return coverUrl(value, url => /^is\d+-ssl\.mzstatic\.com$/.test(url.hostname))
    ?.replace(/\/\d+x\d+bb\.(?:jpg|png)$/, '/300x450bb.jpg') ?? null
}
function timestamp(value: unknown, now: number): string {
  const date = Date.parse(text(value))
  if (!Number.isFinite(date) || date > now + 300_000 || now - date > CHART_MAX_AGE_MS) throw new Error('Invalid chart date')
  return new Date(date).toISOString()
}
export function previousKoreanDate(now = Date.now()): string {
  return new Date(now + 9 * 3600_000 - 24 * 3600_000).toISOString().slice(0, 10)
}
/** YES24 전일 순위는 자정 직후 바로 발행되지 않는다 — 그 사이 이전 발행일로 거슬러 조회한다.
 *  selectBookChart가 48시간 넘는 기준일을 숨기므로 D-1·D-2만 의미가 있다 */
export const YES24_CHART_LOOKBACK_DAYS = 2
export function recentKoreanChartDates(now = Date.now()): string[] {
  return Array.from({ length: YES24_CHART_LOOKBACK_DAYS }, (_, i) => previousKoreanDate(now - i * 24 * 3600_000))
}
export function yes24ChartEnabled(env: { YES24_API_KEY?: string; YES24_CHARTS_ENABLED?: string; NODE_ENV?: string }): boolean {
  return Boolean(env.YES24_API_KEY?.trim()) && (env.NODE_ENV === 'development' || env.YES24_CHARTS_ENABLED === 'true')
}
function rows(value: unknown): JsonObject[] {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new Error('Invalid chart items')
  return value.map(object)
}
function unique(items: BestsellerItem[]): BestsellerItem[] {
  for (const field of ['id', 'rank'] as const) {
    const values = items.map(item => item[field]).filter(value => value !== null)
    if (new Set(values).size !== values.length) throw new Error('Duplicate chart item')
  }
  return items.slice(0, LIMIT)
}
const baseItem = { publisher: null, published_date: null, isbn: null, description: null, type: 'BOOK', category_key: 'ALL' }

export function parseYes24Chart(value: unknown, basisDate: string, now = Date.now()): BookChart {
  if (!recentKoreanChartDates(now).includes(basisDate)) throw new Error('Invalid chart basis date')
  const root = object(value)
  if (root.success !== true || root.errorCode) throw new Error('YES24 chart request rejected')
  const data = object(root.data)
  const meta = object(data.meta)
  const apiLink = safeUrl(meta.apiLink, url => url.hostname === 'apis.yes24.com' && url.pathname === '/v1/category/bestsellerDaily')
  const queryDate = new URL(apiLink).searchParams.get('date')
  if (queryDate && queryDate !== basisDate) throw new Error('Chart basis date mismatch')
  const updatedAt = timestamp(meta.pubDate, now)
  const items = rows(data.items).map(row => {
    const itemId = String(row.itemId)
    if (!/^\d+$/.test(itemId) || !Number.isSafeInteger(row.sortOrder) || Number(row.sortOrder) < 1) throw new Error('Invalid chart identity')
    const isbn = typeof row.isbn13 === 'string' && /^97[89]\d{10}$/.test(row.isbn13) ? row.isbn13 : null
    if (!YES24_BOOK_GOODS_TYPES.includes(String(row.goodsType))) throw new Error('Invalid chart book')
    return { ...baseItem, id: `yes24-${itemId}`, rank: Number(row.sortOrder), title: text(row.title), creator: creator(row.author), isbn,
      thumbnail_url: coverUrl(row.cover, url => url.hostname === 'image.yes24.com'),
      source_url: safeUrl(row.link, url => url.hostname === 'www.yes24.com' && url.pathname.toLowerCase() === `/product/goods/${itemId}`),
      // 수수료가 붙는 애드온 주소 — 모양이 다르면 버리고 상품 주소로 연다
      purchase_url: yes24ProductUrl(row.addOnLink, Number(itemId), true),
    }
  })
  if (items.some((item, index) => index > 0 && item.rank <= items[index - 1].rank)) throw new Error('Invalid chart order')
  return { items: unique(items), updatedAt, basisDate, fetchedAt: new Date(now).toISOString(), sources: sources.ko }
}

export function parseAppleBooksChart(value: unknown, now = Date.now()): BookChart {
  const feed = object(object(value).feed)
  if (feed.id !== APPLE_BOOKS_FEED_URL || feed.country !== 'us') throw new Error('Invalid Apple Books chart')
  const updatedAt = timestamp(feed.updated, now)
  const items = rows(feed.results).map((row, index) => {
    const id = text(row.id)
    if (!/^\d+$/.test(id) || row.kind !== 'books') throw new Error('Invalid chart book')
    return { ...baseItem, id: `apple-books-${id}`, rank: index + 1, title: text(row.name), creator: creator(row.artistName),
      thumbnail_url: appleCover(row.artworkUrl100),
      source_url: safeUrl(row.url, url => url.hostname === 'books.apple.com' && url.pathname.startsWith('/us/book/') && url.pathname.endsWith(`/id${id}`)),
    }
  })
  return { items: unique(items), updatedAt, fetchedAt: new Date(now).toISOString(), sources: sources.en }
}

async function fetchJson(fetcher: typeof fetch, url: string, headers: HeadersInit): Promise<unknown> {
  const response = await fetcher(url, { headers, signal: AbortSignal.timeout(15_000), redirect: 'error' })
    .catch(() => { throw new Error('Book chart network request failed') })
  if (!response.ok) throw new Error(`Book chart HTTP ${response.status}`)
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Invalid chart content type')
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Chart exceeds size limit')
  if (!response.body) throw new Error('Empty chart response')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Chart exceeds size limit') }
      chunks.push(value)
    }
  } catch { throw new Error(size > MAX_BYTES ? 'Chart exceeds size limit' : 'Chart response interrupted') }
  finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return JSON.parse(new TextDecoder().decode(bytes))
}
export async function fetchYes24Chart(fetcher: typeof fetch, apiKey: string, basisDate: string, now = Date.now()): Promise<BookChart> {
  if (!apiKey.trim()) throw new Error('YES24 chart key missing')
  if (!recentKoreanChartDates(now).includes(basisDate)) throw new Error('Invalid chart basis date')
  const url = new URL('https://apis.yes24.com/v1/category/bestsellerDaily')
  url.search = new URLSearchParams({ categoryId: '001', date: basisDate, page: '1', pageSize: String(LIMIT), detail: 'N' }).toString()
  return parseYes24Chart(await fetchJson(fetcher, url.href, { Accept: 'application/json', 'X-Api-Key': apiKey }), basisDate, now)
}
export async function fetchAppleBooksChart(fetcher: typeof fetch, now = Date.now()): Promise<BookChart> {
  return parseAppleBooksChart(await fetchJson(fetcher, APPLE_BOOKS_FEED_URL, { Accept: 'application/json' }), now)
}
export function selectBookChart(chart: BookChart | null, locale: 'ko' | 'en', now = Date.now()): BookChartSelection {
  const age = chart ? Math.max(now - Date.parse(chart.updatedAt), now - Date.parse(chart.fetchedAt)) : Infinity
  const basisAge = chart?.basisDate ? now - Date.parse(`${chart.basisDate}T23:59:59+09:00`) : 0
  if (!chart || !Number.isFinite(age) || age > CHART_MAX_AGE_MS || basisAge > CHART_MAX_AGE_MS) {
    return { items: [], updatedAt: '', sources: sources[locale], isStale: false, status: 'unavailable' }
  }
  return { items: chart.items, updatedAt: chart.updatedAt, basisDate: chart.basisDate, sources: chart.sources,
    isStale: age > CHART_CACHE_SECONDS[locale] * 1000, status: 'ready' }
}
