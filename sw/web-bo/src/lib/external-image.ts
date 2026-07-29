/**
 * 외부 콘텐츠 이미지 주소 검사·다운로드 공용부.
 *
 * content_locales.thumbnail_url을 화면에서 중계할 때와 Remotion 로컬 표지 캐시로
 * 내려받을 때 같은 허용 목록·리다이렉트 규칙을 써야 한다. 둘이 갈라지면 web-bo에서는
 * 보이는데 렌더 캐시에는 못 받거나, 반대로 관리 화면이 막은 주소를 서버가 가져가는
 * 불일치가 생긴다.
 */

export const ALLOWED_IMAGE_HOSTS = new Set([
  'shopping-phinf.pstatic.net', // 네이버 쇼핑(도서)
  'bookthumb-phinf.pstatic.net', // 네이버 책
  'i.scdn.co', // Spotify
  'image.tmdb.org', // TMDB
  'i.gr-assets.com', // Goodreads
  'covers.openlibrary.org', // OpenLibrary
  'books.google.com', // 레거시 도서 표지
  'images.igdb.com', // IGDB
  'image.aladin.co.kr', // 알라딘
  'image.yes24.com', // YES24
  'upload.wikimedia.org', // 위키미디어
])

/** 내부망·사설·루프백 주소 리터럴 차단 */
export function isBlockedImageHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (h === 'localhost' || h.endsWith('.localhost') || h === '::1' || h === '0.0.0.0') return true

  // IPv4 리터럴만 검사한다. 도메인은 허용 목록이 이미 걸러낸다.
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (v4) {
    const [a, b] = v4.slice(1).map(Number)
    if (a === 127 || a === 10 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 100 && b >= 64 && b <= 127) return true
  }

  // IPv6 사설·루프백 (fc00::/7, fe80::/10)
  if (/^(fc|fd|fe8|fe9|fea|feb)/.test(h) && h.includes(':')) return true

  return false
}

export type ImageTargetValidation =
  | { url: URL }
  | { error: string; status: number }

/** 중계·다운로드 가능한 주소인지 검사. 통과하면 정규화된 URL을 돌려준다. */
export function validateExternalImageUrl(raw: string): ImageTargetValidation {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { error: '주소 형식이 올바르지 않다.', status: 400 }
  }

  // 레거시 도서 표지는 http로 저장된 행이 있다. 허용 호스트 확인 전에는 올리지 않는다.
  if (url.protocol === 'http:' && url.hostname.toLowerCase() === 'books.google.com') {
    url.protocol = 'https:'
  }

  const hostname = url.hostname.toLowerCase()

  if (isBlockedImageHost(hostname)) {
    return { error: '내부망 주소는 사용할 수 없다.', status: 403 }
  }
  if (!ALLOWED_IMAGE_HOSTS.has(hostname)) {
    return { error: `허용 목록에 없는 호스트다: ${hostname}`, status: 403 }
  }
  if (url.protocol !== 'https:') {
    return { error: `허용하지 않는 프로토콜이다: ${url.protocol}`, status: 400 }
  }

  return { url }
}

/**
 * 허용된 최초 주소의 리다이렉트를 직접 따라간다.
 *
 * OpenLibrary가 archive.org 가변 노드로 넘기므로 경유 호스트를 고정 목록으로 제한하지
 * 않는다. 대신 매 홉에서 내부망·비 HTTP(S) 이동을 차단한다.
 */
export async function fetchExternalImageFollowingRedirects(start: URL): Promise<Response> {
  const MAX_HOPS = 5
  let target = start

  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const response: Response = await fetch(target, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    const location = response.headers.get('location')
    if (response.status < 300 || response.status >= 400 || !location) {
      return response
    }

    let next: URL
    try {
      next = new URL(location, target)
    } catch {
      throw new Error(`리다이렉트 주소가 올바르지 않다: ${location}`)
    }

    if (next.protocol !== 'https:' && next.protocol !== 'http:') {
      throw new Error(`리다이렉트 프로토콜이 허용되지 않는다: ${next.protocol}`)
    }
    if (isBlockedImageHost(next.hostname)) {
      throw new Error(`리다이렉트가 내부망을 가리킨다: ${next.hostname}`)
    }

    target = next
  }

  throw new Error('리다이렉트가 너무 많다.')
}

