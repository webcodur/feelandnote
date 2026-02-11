import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  let imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return new NextResponse('URL parameter required', { status: 400 })
  }

  // Google Books API URL의 경우 http를 https로 강제 변환
  if (imageUrl.includes('books.google.com')) {
    imageUrl = imageUrl.replace(/^http:\/\//i, 'https://')
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      console.error(`[image-proxy] Fetch failed: ${response.status} ${response.statusText} for ${imageUrl}`)
      // Rate limit 또는 접근 제한 시 원본 URL로 리다이렉트 (클라이언트가 직접 시도)
      if (response.status === 429 || response.status === 403) {
        return NextResponse.redirect(imageUrl)
      }
      // 204 No Content는 이미지가 없다는 의미이므로 404 반환
      if (response.status === 204) {
        return new NextResponse(null, { status: 404 })
      }
      throw new Error(`Image fetch failed: ${response.status}`)
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
    console.error('[image-proxy] Error fetching', imageUrl, ':', error)
    // 에러 시 투명한 1x1 픽셀 PNG 반환 (이미지 깨짐 방지)
    const transparentPixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    return new NextResponse(transparentPixel, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }
}
