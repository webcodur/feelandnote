import { normalizeKakaoBookCoverUrl } from '@feelandnote/content-search/kakao-books'

const ALLOWED_IMAGE_HOSTS = new Set([
  'archive.org',
  'assets.feelandnote.com',
  't1.daumcdn.net',
  'image.tmdb.org',
  'covers.openlibrary.org',
  'i.gr-assets.com',
  'images.igdb.com',
  'books.google.com',
  'image.aladin.co.kr',
  'image.yes24.com',
  'upload.wikimedia.org',
  'contents.kyobobook.co.kr',
])

const ALLOWED_IMAGE_HOST_SUFFIXES = [
  '.archive.org',
  '.r2.dev',
  '.mzstatic.com',
  '.imgix.net',
  '.bigcommerce.com',
]

export function isAllowedSeoImageUrl(url: URL): boolean {
  if (url.protocol !== 'https:') return false
  if (url.username || url.password || url.port) return false

  const hostname = url.hostname.toLowerCase()
  return ALLOWED_IMAGE_HOSTS.has(hostname)
    || ALLOWED_IMAGE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
}
/** Read legacy cover URLs through the same conversion used at collection time. */
export function normalizeSeoImageUrl(url: URL): URL {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return url

  if (url.hostname === 'search1.kakaocdn.net') {
    try {
      const source = normalizeKakaoBookCoverUrl(url.href)
      if (!source) return url
      const original = new URL(source)
      // Unwrapping a URL must never grant access to another origin.
      return isAllowedSeoImageUrl(original) ? original : url
    } catch {
      return url
    }
  }

  if (url.protocol === 'http:') {
    const secure = new URL(url.href)
    secure.protocol = 'https:'
    if (isAllowedSeoImageUrl(secure)) return secure
  }
  return url
}
