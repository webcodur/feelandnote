import { equivalentIsbns, toIsbn13 } from './book-isbn'

export const AMAZON_BOOK_REQUEST_TIMEOUT_MS = 8000
export const AMAZON_BOOK_AGENT_USER_AGENT = 'Agent/FeelandnoteAmazonLinkVerifier'
export const AMAZON_BOOK_BATCH_SIZE = 32
export const AMAZON_BOOK_CONCURRENCY = 8

export interface AmazonBookIdentity {
  locale: string
  isbn?: string | null
  title?: string | null
  creator?: string | null
}
export interface AmazonBookPage {
  status: number
  url: string
  title: string
  byline: string
  asin: string
  details: string
  blocked: boolean
}
export interface AmazonBookProduct {
  platform: 'amazon'
  productId: string
  productUrl: string
  affiliateUrl: string
  qualityEvidence: string[]
}
export type AmazonBookLookup =
  | { status: 'verified'; product: AmazonBookProduct; page: AmazonBookPage }
  | { status: 'unconfirmed' | 'mismatch' | 'unsupported'; reason: string; page?: AmazonBookPage }

/** ISBN-10 is only a candidate ASIN. No product is registered before checking its detail page. */
export function amazonBookCandidate(book: AmazonBookIdentity): { asin: string; productUrl: string } | null {
  if (book.locale !== 'en') return null
  const asin = equivalentIsbns(book.isbn ?? '').find(value => value.length === 10)
  return asin ? { asin, productUrl: `https://www.amazon.com/dp/${asin}` } : null
}

/** Self-contained so the authorized browser transport can run the same parser without exporting cookies. */
export function parseAmazonBookPage(html: string, status: number, url: string): AmazonBookPage {
  function clean(value: string) {
    const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', lrm: '', rlm: '' }
    return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ').replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (source, entity: string) => {
        if (!entity.startsWith('#')) return named[entity.toLowerCase()] ?? source
        const code = parseInt(entity.slice(entity[1]?.toLowerCase() === 'x' ? 2 : 1), entity[1]?.toLowerCase() === 'x' ? 16 : 10)
        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : source
      }).replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim()
  }
  const title = clean(html.match(/<span\b[^>]*\bid\s*=\s*["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? '')
  const byline = clean(html.match(/<div\b[^>]*\bid\s*=\s*["']bylineInfo["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '')
  const bullets = html.match(/<div\b[^>]*\bid\s*=\s*["']detailBullets_feature_div["'][^>]*>([\s\S]*?)<\/ul>/i)?.[1] ?? ''
  const table = html.match(/<table\b[^>]*\bid\s*=\s*["']productDetails_detailBullets_sections1["'][^>]*>([\s\S]*?)<\/table>/i)?.[1] ?? ''
  const asinTag = html.match(/<input\b(?=[^>]*\bid\s*=\s*["']ASIN["'])[^>]*>/i)?.[0] ?? ''
  const asin = asinTag.match(/\bvalue\s*=\s*["']([A-Z0-9]{10})["']/)?.[1] ?? ''
  return { status, url, title, byline, asin, details: clean(bullets || table),
    blocked: /validateCaptcha|captcha\.amazon|Robot Check|automated access to Amazon|Enter the characters you see below/i.test(html) }
}

function normalize(value: string) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/&/g, ' and ')
    .replace(/\bthe\b/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

export function verifyAmazonBookProduct(book: AmazonBookIdentity, page: AmazonBookPage): AmazonBookLookup {
  const isbn = toIsbn13(book.isbn ?? '')
  if (book.locale !== 'en' || !isbn) return { status: 'unsupported', reason: 'english_isbn_required' }
  let target: URL
  try { target = new URL(page.url) } catch { return { status: 'unconfirmed', reason: 'invalid_response_url', page } }
  const asin = target.pathname.match(/^\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/)?.[1]
  if (target.protocol !== 'https:' || !/^(www\.)?amazon\.com$/.test(target.hostname) || target.username || target.password || !asin) {
    return { status: 'unconfirmed', reason: 'not_amazon_product', page }
  }
  if (page.status !== 200 || page.blocked || !page.title || !page.details || !page.asin) {
    return { status: 'unconfirmed', reason: page.blocked ? 'amazon_challenge' : `product_unavailable_${page.status}`, page }
  }
  if (asin !== page.asin) return { status: 'mismatch', reason: 'asin_mismatch', page }
  const found = [...page.details.matchAll(/ISBN[- ](?:10|13)\s*:\s*([\dXx][\dXx\s-]{8,20})/g)]
    .map(match => toIsbn13(match[1].trim())).filter(Boolean)
  if (!found.length || found.some(value => value !== isbn)) return { status: 'mismatch', reason: 'isbn_mismatch_or_missing', page }
  const language = page.details.match(/Language\s*:\s*(.*?)(?=\b(?:Print length|ISBN|Item Weight|Dimensions|Reading age|Publisher|Publication date|Edition)\b|$)/i)?.[1]?.trim() ?? ''
  if (!/\bEnglish\b/i.test(language)) return { status: 'mismatch', reason: 'english_not_confirmed', page }
  const title = normalize(book.title ?? ''), actual = normalize(page.title)
  const bundle = /\b(?:box(?:ed)?\s+set|set of \d+|pack of \d+|copies each)\b/i
  if (bundle.test(actual) && !bundle.test(title)) return { status: 'mismatch', reason: 'title_mismatch', page }
  if (!title || !actual || !(actual === title || actual.startsWith(title + ' ') || title.startsWith(actual + ' '))) {
    return { status: 'mismatch', reason: 'title_mismatch', page }
  }
  const author = normalize(book.creator ?? '')
  const byline = normalize(page.byline)
  if (!author || !byline || !author.split(' ').every(word => byline.split(' ').includes(word))) {
    return { status: 'mismatch', reason: 'author_mismatch_or_missing', page }
  }
  const productUrl = `https://www.amazon.com/dp/${asin}`
  return { status: 'verified', page, product: { platform: 'amazon', productId: asin, productUrl, affiliateUrl: productUrl,
    qualityEvidence: [`ISBN ${isbn} matches this edition's product details`, `Title: ${page.title}`, `Author: ${page.byline}`, `Language: ${language}`] } }
}

/** Network failures never mean no product. Registration remains usable and a later backfill can retry. */
export async function lookupAmazonBookProduct(book: AmazonBookIdentity, transport: typeof fetch = fetch): Promise<AmazonBookLookup> {
  const candidate = amazonBookCandidate(book)
  if (!candidate) return { status: 'unsupported', reason: 'no_isbn10_candidate' }
  try {
    const response = await transport(candidate.productUrl, { headers: { 'User-Agent': AMAZON_BOOK_AGENT_USER_AGENT }, signal: AbortSignal.timeout(AMAZON_BOOK_REQUEST_TIMEOUT_MS), redirect: 'follow' })
    return verifyAmazonBookProduct(book, parseAmazonBookPage(await response.text(), response.status, response.url || candidate.productUrl))
  } catch { return { status: 'unconfirmed', reason: 'amazon_request_failed' } }
}
