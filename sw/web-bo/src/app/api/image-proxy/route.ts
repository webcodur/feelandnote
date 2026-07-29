import { NextRequest, NextResponse } from 'next/server'
import {
  fetchExternalImageFollowingRedirects,
  validateExternalImageUrl,
} from '@/lib/external-image'

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
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return new NextResponse('URL parameter required', { status: 400 })
  }

  const checked = validateExternalImageUrl(imageUrl)

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
    const response = await fetchExternalImageFollowingRedirects(checked.url)

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
