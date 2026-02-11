import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return new NextResponse('URL parameter required', { status: 400 })
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      // Rate limit 또는 접근 제한 시 원본 URL로 리다이렉트 (클라이언트가 직접 시도)
      if (response.status === 429 || response.status === 403) {
        return NextResponse.redirect(imageUrl)
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
    console.error('[image-proxy] Error:', error)
    return new NextResponse(null, { status: 404 })
  }
}
