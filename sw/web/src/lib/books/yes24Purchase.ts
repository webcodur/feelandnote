import type { AffiliateLink } from '@/constants/affiliatePlatforms'

export const YES24_PURCHASE_CACHE_SECONDS = 24 * 3600
export const YES24_PURCHASE_MAX_AGE_MS = 48 * 3600_000
export const YES24_PURCHASE_ENDPOINT = 'https://apis.yes24.com/v1/goods/itemDetail'
const RESPONSE_MAX_BYTES = 1_000_000
const REQUEST_TIMEOUT_MS = 15_000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface Yes24PurchaseResult {
  link: AffiliateLink | null
  fetchedAt: number
}

export function isYes24PurchaseRequest(contentId: unknown, locale: unknown, editionId?: unknown): boolean {
  return typeof contentId === 'string' && UUID_PATTERN.test(contentId) && locale === 'ko'
    && (editionId === undefined || (typeof editionId === 'number' && Number.isSafeInteger(editionId) && editionId > 0))
}

export function yes24PurchaseEnabled(env: { NODE_ENV?: string; YES24_API_KEY?: string; YES24_PURCHASE_ENABLED?: string }): boolean {
  return Boolean(env.YES24_API_KEY?.trim()) && (env.NODE_ENV === 'development' || env.YES24_PURCHASE_ENABLED === 'true')
}

/** Normalize separators only; never convert a foreign edition or guess another ISBN. */
export function normalizePurchaseIsbn(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 32) return null
  const isbn = value.replace(/[\s-]/g, '')
  if (!/^97[89]\d{10}$/.test(isbn)) return null
  const sum = [...isbn].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0)
  return sum % 10 === 0 ? isbn : null
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid YES24 purchase response')
  return value as Record<string, unknown>
}

function productUrl(value: unknown, itemId: number, addon = false): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    if (addon) {
      if (url.hostname !== 'apis.yes24.com' || !new RegExp(`^/a/[A-Za-z0-9_-]{1,200}/goods/${itemId}$`).test(url.pathname)
        || url.search || url.hash) return null
    } else if (url.hostname !== 'www.yes24.com' || url.pathname.toLowerCase() !== `/product/goods/${itemId}`) return null
    return url.href
  } catch { return null }
}

export function parseYes24Purchase(value: unknown, isbn: string, now = Date.now()): Yes24PurchaseResult {
  if (normalizePurchaseIsbn(isbn) !== isbn) throw new Error('Invalid purchase ISBN')
  const root = object(value)
  if (root.success !== true || root.errorCode) throw new Error('YES24 purchase request rejected')
  const data = object(root.data)
  if (!Array.isArray(data.items) || data.items.length > 100) throw new Error('Invalid YES24 purchase items')
  const matches = data.items.map(object).filter(item =>
    item.isbn13 === isbn && item.itemStatus === '판매중' && ['도서', '국내도서'].includes(String(item.goodsType))
      && typeof item.itemId === 'number' && Number.isSafeInteger(item.itemId) && item.itemId > 0,
  ).sort((a, b) => Number(a.itemId) - Number(b.itemId))
  for (const item of matches) {
    const original = productUrl(item.link, Number(item.itemId))
    if (!original) continue
    // Unrecognized affiliate redirect formats must not replace the verified product URL.
    const url = productUrl(item.addOnLink, Number(item.itemId), true) ?? original
    return { link: { platform: 'yes24', url }, fetchedAt: now }
  }
  return { link: null, fetchedAt: now }
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Invalid purchase content type')
  if (Number(response.headers.get('content-length')) > RESPONSE_MAX_BYTES || !response.body) throw new Error('Invalid purchase response size')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > RESPONSE_MAX_BYTES) { await reader.cancel(); throw new Error('Purchase response exceeds size limit') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return JSON.parse(new TextDecoder().decode(bytes))
}

export async function fetchYes24Purchase(fetcher: typeof fetch, isbn: string, apiKey: string): Promise<Yes24PurchaseResult> {
  if (normalizePurchaseIsbn(isbn) !== isbn || !apiKey.trim()) throw new Error('Invalid purchase request')
  const url = new URL(YES24_PURCHASE_ENDPOINT)
  url.search = new URLSearchParams({ searchType: 'ISBN13', query: isbn, detail: 'N' }).toString()
  try {
    const response = await fetcher(url.href, {
      headers: { Accept: 'application/json', 'X-Api-Key': apiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), redirect: 'error',
    })
    if (response.status === 404) return { link: null, fetchedAt: Date.now() }
    if (!response.ok) throw new Error('YES24 purchase HTTP error')
    return parseYes24Purchase(await readJson(response), isbn)
  } catch {
    // Do not retain upstream errors or request headers containing the API key.
    throw new Error('YES24 purchase unavailable')
  }
}

export function selectYes24Purchase(result: Yes24PurchaseResult, now = Date.now()): AffiliateLink | null {
  const age = now - result.fetchedAt
  return Number.isFinite(age) && age >= 0 && age <= YES24_PURCHASE_MAX_AGE_MS ? result.link : null
}
