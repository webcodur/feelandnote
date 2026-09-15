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

export function productUrl(value: unknown, itemId: number, addon = false): string | null {
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
    item.isbn13 === isbn && item.itemStatus === '판매중' && ['도서', '국내도서', '만화'].includes(String(item.goodsType))
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

// ── 상품 상세 — 서재 베스트셀러 차트의 「책 상세 보기」 모달이 쓴다 ──

export const YES24_DETAIL_INTRO_MAX_CHARS = 3000

export interface Yes24BookDetail {
  itemId: number
  isbn: string
  title: string
  subTitle: string | null
  author: string | null
  publisher: string | null
  /** YYYY-MM-DD */
  publishDate: string | null
  pages: number | null
  shopPrice: number | null
  salePrice: number | null
  starScore: number | null
  /** 판매 상태가 「판매중」인가 */
  onSale: boolean
  /** YES24 판매지수 */
  salePoint: number | null
  cover: string | null
  /** 애드온 제휴 주소. 모양이 어긋나면 상품 주소 */
  purchaseUrl: string | null
  introduction: string | null
}

/** API 문자열을 평문으로 — 줄바꿈 태그는 줄로 바꾸고 나머지 태그는 걷는다 */
function detailText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!text) return null
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

const detailNumber = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null)

function detailCover(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'image.yes24.com' && !url.username && !url.password && !url.port ? url.href : null
  } catch {
    return null
  }
}

export function parseYes24BookDetail(value: unknown, isbn: string): Yes24BookDetail | null {
  if (normalizePurchaseIsbn(isbn) !== isbn) throw new Error('Invalid detail ISBN')
  const root = object(value)
  if (root.success !== true || root.errorCode) throw new Error('YES24 detail request rejected')
  const data = object(root.data)
  if (!Array.isArray(data.items) || data.items.length > 100) throw new Error('Invalid YES24 detail items')
  const item = data.items.map(object).find((row) =>
    row.isbn13 === isbn && typeof row.itemId === 'number' && Number.isSafeInteger(row.itemId) && row.itemId > 0,
  )
  if (!item) return null
  const itemId = Number(item.itemId)
  const title = detailText(item.title, 300)
  if (!title) return null
  const content = item.contentDetail && typeof item.contentDetail === 'object' && !Array.isArray(item.contentDetail)
    ? item.contentDetail as Record<string, unknown>
    : {}
  const rawDate = typeof item.publishDate === 'string' && /^\d{8}$/.test(item.publishDate) ? item.publishDate : null
  return {
    itemId,
    isbn,
    title,
    subTitle: detailText(item.subTitle, 300),
    author: detailText(item.author, 300),
    publisher: detailText(item.publisher, 200),
    publishDate: rawDate ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}` : null,
    pages: detailNumber(item.pages),
    shopPrice: detailNumber(item.shopPrice),
    salePrice: detailNumber(item.salePrice),
    starScore: detailNumber(item.starScore),
    onSale: item.itemStatus === '판매중',
    salePoint: detailNumber(item.salePoint),
    cover: detailCover(item.cover),
    purchaseUrl: productUrl(item.addOnLink, itemId, true) ?? productUrl(item.link, itemId),
    introduction: detailText(content.bookIntroduction, YES24_DETAIL_INTRO_MAX_CHARS),
  }
}

// ── 판매 정보 — 인물 화면 연관 작품에서 고른 판본이 팔리고 있을 때 제목 아래에 띄운다 ──

export type Yes24SalesInfo = Pick<Yes24BookDetail, 'salePoint' | 'starScore' | 'salePrice' | 'shopPrice'>

/** 판매중인 상품만 판매 정보를 낸다. 절판·품절·미확인이면 null */
export function selectYes24Sales(detail: Yes24BookDetail | null): Yes24SalesInfo | null {
  if (!detail?.onSale) return null
  const { salePoint, starScore, salePrice, shopPrice } = detail
  return { salePoint, starScore, salePrice, shopPrice }
}

export async function fetchYes24BookDetail(fetcher: typeof fetch, isbn: string, apiKey: string): Promise<Yes24BookDetail | null> {
  if (normalizePurchaseIsbn(isbn) !== isbn || !apiKey.trim()) throw new Error('Invalid detail request')
  const url = new URL(YES24_PURCHASE_ENDPOINT)
  url.search = new URLSearchParams({ searchType: 'ISBN13', query: isbn, detail: 'Y' }).toString()
  try {
    const response = await fetcher(url.href, {
      headers: { Accept: 'application/json', 'X-Api-Key': apiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), redirect: 'error',
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error('YES24 detail HTTP error')
    return parseYes24BookDetail(await readJson(response), isbn)
  } catch {
    // Do not retain upstream errors or request headers containing the API key.
    throw new Error('YES24 detail unavailable')
  }
}
