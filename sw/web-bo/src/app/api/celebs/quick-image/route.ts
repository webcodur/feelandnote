import { NextRequest, NextResponse } from 'next/server'

/**
 * 즉시 등록 창구 — 바깥 브라우저의 확장(tools/celeb-image-grabber)이 Alt+클릭한
 * 사진을 여기로 밀어넣고, 셀럽 이미지 작업 화면이 꺼내 자르기 창을 띄운다.
 *
 * 이 창구는 관리자 로그인 검사를 거치지 않는다(proxy.ts에서 제외). 확장이 보내는
 * 요청에는 백오피스 쿠키가 실리지 않기 때문이다. 대신 두 겹으로 막는다.
 *  1) 요청이 로컬 주소(localhost·127.0.0.1)로 들어온 경우에만 응답한다.
 *     배포 도메인에서는 항상 404다.
 *  2) 사진 본문만 받고 어떤 식별자도 받지 않는다. 대상 인물은 화면이 정한다.
 *
 * 보관은 서버 메모리다. 개발 서버가 재시작되면 비워지며, 그래도 무방하다
 * (자르기 전 단계의 임시 사진이고, 저장은 기존 아바타 저장 경로가 한다).
 */

interface QuickImage {
  body: Buffer
  contentType: string
  sourceUrl: string
  pageUrl: string
  receivedAt: number
}

// 개발 서버 핫리로드가 모듈을 다시 평가해도 대기열이 날아가지 않도록 전역에 둔다.
const globalStore = globalThis as typeof globalThis & {
  __celebQuickImageQueue?: QuickImage[]
}
const queue: QuickImage[] = (globalStore.__celebQuickImageQueue ??= [])

const MAX_BYTES = 25 * 1024 * 1024
const MAX_QUEUE = 5
const MAX_AGE_MS = 5 * 60 * 1000

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Source-Url, X-Page-Url',
}

function isLocalRequest(request: NextRequest): boolean {
  const host = request.headers.get('host') ?? ''
  const hostname = host.split(':')[0]
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 })
}

function dropStale(): void {
  const deadline = Date.now() - MAX_AGE_MS
  while (queue.length > 0 && queue[0].receivedAt < deadline) queue.shift()
}

export async function OPTIONS(request: NextRequest) {
  if (!isLocalRequest(request)) return notFound()
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  if (!isLocalRequest(request)) return notFound()

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) {
    return NextResponse.json(
      { error: '이미지만 받습니다.' },
      { status: 415, headers: CORS_HEADERS },
    )
  }

  const body = Buffer.from(await request.arrayBuffer())
  if (body.byteLength === 0) {
    return NextResponse.json(
      { error: '빈 이미지입니다.' },
      { status: 400, headers: CORS_HEADERS },
    )
  }
  if (body.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: `사진이 너무 큽니다(${Math.round(body.byteLength / 1024 / 1024)}MB).` },
      { status: 413, headers: CORS_HEADERS },
    )
  }

  dropStale()
  queue.push({
    body,
    contentType,
    sourceUrl: decodeHeader(request.headers.get('x-source-url')),
    pageUrl: decodeHeader(request.headers.get('x-page-url')),
    receivedAt: Date.now(),
  })
  while (queue.length > MAX_QUEUE) queue.shift()

  return NextResponse.json(
    { ok: true, waiting: queue.length },
    { status: 200, headers: CORS_HEADERS },
  )
}

/** 화면이 1초 남짓 간격으로 부른다. 대기 중인 사진이 없으면 204. */
export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) return notFound()

  dropStale()
  const next = queue.shift()
  if (!next) {
    return new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  return new NextResponse(new Uint8Array(next.body), {
    status: 200,
    headers: {
      'Content-Type': next.contentType,
      'Cache-Control': 'no-store',
      'X-Source-Url': encodeURIComponent(next.sourceUrl),
      'X-Page-Url': encodeURIComponent(next.pageUrl),
      'X-Waiting': String(queue.length),
    },
  })
}

function decodeHeader(value: string | null): string {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
