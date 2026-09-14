import { forLocale } from '@feelandnote/content-search/book-introduction'
import { toIsbn13 } from '@feelandnote/content-search/kakao-books'
import type { IntroductionChange, IntroductionRow } from './book-description-sources-contract'

export interface Yes24Introduction {
  isbn: string
  title?: string
  author?: string
  sourceUrl: string | null
  description: string | null
  reason: string
}

/** Keep the introduction inside its own balanced div; adjacent reviews are never candidates. */
function introductionSection(html: string): string | null {
  const marker = /<div\b[^>]*\bid=["']infoset_introduce["'][^>]*>/i.exec(html)
  if (!marker) return null
  const tags = /<!--[\s\S]*?-->|<(script|style|textarea)\b[^>]*>[\s\S]*?<\/\1>|<\/?div\b[^>]*>/gi
  tags.lastIndex = marker.index
  let depth = 0
  for (let token; (token = tags.exec(html));) {
    if (/^<div\b/i.test(token[0])) depth++
    else if (/^<\/div\b/i.test(token[0]) && --depth === 0) return html.slice(marker.index, tags.lastIndex)
  }
  throw new Error('Unclosed YES24 introduction section')
}

function decode(value: string): string {
  return value.replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
    const n = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)
    return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : ''
  }).replace(/&(nbsp|quot|apos|lt|gt|amp);/gi, (_, name: string) =>
    ({ nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', amp: '&' })[name.toLowerCase()]!)
}

export function extractYes24Introduction(html: string, isbn: string): string | null {
  // ISBN in a recommendation elsewhere on the page does not establish product identity.
  const pageIsbn = html.match(/<th\b[^>]*>\s*ISBN13\s*<\/th>\s*<td\b[^>]*>\s*(\d{13})\s*<\/td>/i)?.[1]
  if (pageIsbn !== isbn) throw new Error('YES24 product page ISBN mismatch')
  const block = introductionSection(html)
  const body = block?.match(/<textarea\b[^>]*class=["'][^"']*\btxtContentText\b[^"']*["'][^>]*>([\s\S]*?)<\/textarea>/i)?.[1]
  if (!body) return null
  const text = decode(body).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(?:br\b[^>]*|\/(?:p|div|li|h[1-6]))>/gi, '\n')
    .replace(/<(?:!DOCTYPE\b[^>]*|\/?[a-z][^>]*)>/gi, ' ')
    .replace(/[\t \u00a0]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  // Explicitly cut off source text is left for review, never silently treated as complete.
  return /(?:\.{3,}|\u2026)\s*[,;:"'’”\)\]]*\s*$/.test(text) ? null : forLocale(text, 'ko')
}

export function exactYes24Product(value: unknown, isbn: string): string | null {
  const root = value as { success?: boolean; errorCode?: unknown; data?: { items?: Record<string, unknown>[] } }
  if (root?.success !== true || root.errorCode || !Array.isArray(root.data?.items)) throw new Error('Invalid YES24 response')
  for (const item of root.data.items) {
    if (item.isbn13 !== isbn || !Number.isSafeInteger(item.itemId) || Number(item.itemId) <= 0
      || !['도서', '국내도서', '만화'].includes(String(item.goodsType))) continue
    const expected = `https://www.yes24.com/product/goods/${item.itemId}`
    if (item.link === expected) return expected // Out-of-print editions still have valid introductions.
  }
  return null
}

async function readText(response: Response, max: number): Promise<string> {
  if (!response.body || Number(response.headers.get('content-length')) > max) throw new Error('YES24 response too large')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > max) { await reader.cancel(); throw new Error('YES24 response too large') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks).toString('utf8')
}

export async function fetchYes24Introduction(isbn: string, apiKey: string): Promise<Yes24Introduction> {
  if (toIsbn13(isbn) !== isbn || !apiKey) throw new Error('Invalid YES24 introduction input')
  const empty = { isbn, sourceUrl: null, description: null, reason: 'no-exact-product' }
  const response = await fetch(`https://apis.yes24.com/v1/goods/itemDetail?searchType=ISBN13&query=${isbn}&detail=N`, {
    headers: { Accept: 'application/json', 'X-Api-Key': apiKey }, redirect: 'error', signal: AbortSignal.timeout(20_000),
  })
  if (response.status === 404) return empty
  if (!response.ok) throw new Error(`YES24 API HTTP ${response.status}`)
  const payload = JSON.parse(await readText(response, 1_000_000))
  const sourceUrl = exactYes24Product(payload, isbn)
  if (!sourceUrl) return empty
  const product = payload.data.items.find((item: Record<string, unknown>) => item.isbn13 === isbn && item.link === sourceUrl)
  const page = await fetch(sourceUrl, { redirect: 'error', signal: AbortSignal.timeout(20_000) })
  if (!page.ok) throw new Error(`YES24 page HTTP ${page.status}`)
  const description = extractYes24Introduction(await readText(page, 2_000_000), isbn)
  return { isbn, title: product.title, author: product.author, sourceUrl, description, reason: description ? 'verified-introduction' : 'no-complete-ko-introduction' }
}

export function sameYes24Book(row: IntroductionRow, result: Yes24Introduction): boolean {
  const normalize = (text: string) => text.normalize('NFKC').toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/[^\p{L}\p{N}]/gu, '')
  const title = normalize(row.title ?? '')
  const productTitle = normalize(result.title ?? '')
  const author = normalize(row.creator ?? '')
  const productAuthor = normalize(result.author ?? '')
  return Boolean(title && productTitle && author && productAuthor &&
    (title === productTitle || (Math.min(title.length, productTitle.length) >= 4 && (title.includes(productTitle) || productTitle.includes(title)))) &&
    (author === productAuthor || (Math.min(author.length, productAuthor.length) >= 2 && (productAuthor.includes(author) || author.includes(productAuthor)))))
}

export function planYes24Introduction(table: IntroductionChange['table'], row: IntroductionRow, result: Yes24Introduction): IntroductionChange | null {
  if (row.locale !== 'ko' || row.description?.trim() || toIsbn13(row.isbn ?? '') !== result.isbn
    || !sameYes24Book(row, result)
    || !result.description || !forLocale(result.description, 'ko')
    || !/^https:\/\/www\.yes24\.com\/product\/goods\/[1-9]\d*$/.test(result.sourceUrl ?? '')
    || (row.sources !== null && (typeof row.sources !== 'object' || Array.isArray(row.sources)))) return null
  const sources = { ...row.sources, description: result.sourceUrl }
  // These fields described the old (empty) introduction; retaining them would mislabel original text as a translation.
  for (const key of ['description_translation', 'descriptionTranslation', 'description_method', 'description_type', 'description_source_locale']) delete (sources as Record<string, unknown>)[key]
  return { table, before: row, description: result.description, sources, verifiedDescription: result.description }
}
