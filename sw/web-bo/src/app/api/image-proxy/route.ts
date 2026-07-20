import { NextRequest, NextResponse } from 'next/server'

/**
 * 외부 썸네일 중계 창구.
 *
 * 이 창구는 로그인 검사를 거치지 않는다(proxy.ts에서 제외). 따라서 대상 주소를
 * 제한하지 않으면 누구나 이 서버를 발판 삼아 임의 호스트·내부망으로 요청을
 * 보낼 수 있다(SSRF). 아래 목록에 있는 호스트만 허용한다.
 *
 * 목록 근거: 유일한 호출부인 members/[id]/contents/ContentList.tsx가
 * content_locales.thumbnail_url만 넘긴다. 그 컬럼의 전체 행(13,489건)을 실측해
 * 나온 호스트 11종이다. 새 출처가 늘면 여기에 추가한다.
 */
const ALLOWED_IMAGE_HOSTS = new Set([
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
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (h === 'localhost' || h.endsWith('.localhost') || h === '::1' || h === '0.0.0.0') return true

  // IPv4 리터럴만 검사한다. 도메인은 위 허용 목록이 이미 걸러낸다.
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (v4) {
    const [a, b] = v4.slice(1).map(Number)
    if (a === 127 || a === 10 || a === 0) return true // 루프백 / 사설 / 예약
    if (a === 172 && b >= 16 && b <= 31) return true // 사설
    if (a === 192 && b === 168) return true // 사설
    if (a === 169 && b === 254) return true // 링크로컬(클라우드 메타데이터)
    if (a === 100 && b >= 64 && b <= 127) return true // 캐리어 그레이드 NAT
  }

  // IPv6 사설·루프백 (fc00::/7, fe80::/10)
  if (/^(fc|fd|fe8|fe9|fea|feb)/.test(h) && h.includes(':')) return true

  return false
}

/** 중계 가능한 주소인지 검사. 통과하면 정규화된 URL을 돌려준다. */
function validateTarget(raw: string): { url: URL } | { error: string; status: number } {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { error: '주소 형식이 올바르지 않다.', status: 400 }
  }

  // 레거시 도서 표지는 http로 저장된 행이 있다(실측 168건, 전부 books.google.com).
  // 호스트를 확인한 뒤에만 https로 올린다.
  if (url.protocol === 'http:' && url.hostname.toLowerCase() === 'books.google.com') {
    url.protocol = 'https:'
  }

  const hostname = url.hostname.toLowerCase()

  // 내부망 판정을 프로토콜보다 먼저 본다. 순서가 반대면 http://127.0.0.1이
  // "프로토콜 오류"로 보고돼 차단 사유가 흐려진다.
  if (isBlockedHost(hostname)) {
    return { error: '내부망 주소로는 중계하지 않는다.', status: 403 }
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
 * 리다이렉트를 직접 따라간다.
 *
 * 허용 호스트 중 covers.openlibrary.org는 archive.org의 가변 노드
 * (ia600507.us.archive.org 등)로 두 번 넘긴다. 그래서 중간 경유지까지
 * 허용 목록으로 묶으면 표지 1,681건이 깨진다. 대신 경유지마다 내부망으로
 * 새는지만 막는다 — 최초 주소는 이미 허용 목록으로 확정된 상태다.
 */
async function fetchFollowing(start: URL): Promise<Response> {
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
    if (isBlockedHost(next.hostname)) {
      throw new Error(`리다이렉트가 내부망을 가리킨다: ${next.hostname}`)
    }

    target = next
  }

  throw new Error('리다이렉트가 너무 많다.')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return new NextResponse('URL parameter required', { status: 400 })
  }

  const checked = validateTarget(imageUrl)

  // 차단은 조용히 넘기지 않는다. 호출부(ContentList)는 실패 응답을 받으면
  // onError로 대체 아이콘을 띄우므로 화면도 깨지지 않는다.
  if ('error' in checked) {
    console.warn(`[image-proxy] 차단: ${checked.error} (요청: ${imageUrl})`)
    return NextResponse.json(
      { error: checked.error, url: imageUrl },
      { status: checked.status }
    )
  }

  const targetUrl = checked.url.toString()

  try {
    const response = await fetchFollowing(checked.url)

    if (!response.ok) {
      console.error(`[image-proxy] Fetch failed: ${response.status} ${response.statusText} for ${targetUrl}`)
      // 429·403은 이 서버가 대신 받아낼 수 없는 제한이다. 원본으로 넘겨 브라우저가
      // 자기 자격(쿠키·레퍼러)으로 직접 받아보게 한다 — 성공 여지가 남는 유일한 경우다.
      if (response.status === 429 || response.status === 403) {
        return NextResponse.redirect(targetUrl)
      }
      // 204 No Content는 "이미지가 없다"는 뜻이다. 본문 없는 200이 그대로 나가면
      // 브라우저가 빈 이미지로 읽으므로 없음을 없음으로(404) 바꿔 알린다.
      if (response.status === 204) {
        return new NextResponse(null, { status: 404 })
      }
      // 나머지는 실패로 알린다. 원본이 없으면 404, 그 밖은 중계 실패(502).
      return NextResponse.json(
        { error: `원본이 이미지를 주지 않았다: ${response.status}`, url: targetUrl },
        { status: response.status === 404 ? 404 : 502 }
      )
    }

    const blob = await response.blob()
    const contentType = response.headers.get('Content-Type') || 'image/jpeg'

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (error) {
    console.error('[image-proxy] Error fetching', targetUrl, ':', error)
    // 실패를 200으로 감싸지 않는다. 예전엔 투명한 1x1 PNG를 200으로 돌려줘
    // 호출부의 onError가 뜨지 않았고, 화면엔 빈칸만 남아 원인을 짚을 수 없었다.
    return NextResponse.json(
      { error: '원본을 가져오지 못했다.', detail: String(error), url: targetUrl },
      { status: 502 }
    )
  }
}
