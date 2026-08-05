import { NextRequest, NextResponse } from 'next/server'
import { guardAdminRoute } from '@/lib/admin-route'
import { R2_PUBLIC_URL } from '@/lib/r2'

const MAX_IMAGE_BYTES = 30 * 1024 * 1024

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const denied = await guardAdminRoute()
  if (denied) return denied

  const rawUrl = request.nextUrl.searchParams.get('url')
  if (!rawUrl) return NextResponse.json({ error: '이미지 URL이 필요합니다.' }, { status: 400 })

  let source: URL
  let publicRoot: URL
  try {
    source = new URL(rawUrl)
    publicRoot = new URL(R2_PUBLIC_URL)
  } catch {
    return NextResponse.json({ error: '유효하지 않은 이미지 URL입니다.' }, { status: 400 })
  }

  const rootPath = publicRoot.pathname.replace(/\/$/, '')
  const allowedPath = `${rootPath}/celebs/`
  const isAllowed = source.protocol === 'https:'
    && source.origin === publicRoot.origin
    && source.pathname.startsWith(allowedPath)
    && !source.username
    && !source.password

  if (!isAllowed) {
    return NextResponse.json({ error: '셀럽 R2 이미지만 복사할 수 있습니다.' }, { status: 403 })
  }

  try {
    const response = await fetch(source, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      return NextResponse.json({ error: `이미지 조회 실패: HTTP ${response.status}` }, { status: 502 })
    }

    const contentType = response.headers.get('content-type') || ''
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: '이미지 응답이 아닙니다.' }, { status: 415 })
    }
    if (contentLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: '이미지가 30MB를 초과합니다.' }, { status: 413 })
    }

    const image = await response.arrayBuffer()
    if (image.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: '이미지가 30MB를 초과합니다.' }, { status: 413 })
    }

    return new NextResponse(image, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '이미지 조회 실패'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
