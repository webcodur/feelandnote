import { NextResponse } from 'next/server'
import { createReadStream, existsSync } from 'fs'
import path from 'path'
import { Readable } from 'stream'

// 실행 시점에만 도는 동적 라우트(렌더 산출물 out/ 의 이미지 파일을 fs로 스트리밍). 빌드 타임 정적 분석·prerender 대상이 아님.
// 경로 상수를 모듈 최상위에 두면 Turbopack이 out/ 디렉토리를 번들 자산으로 추적하다 깨진다 → 핸들러 내부에서 런타임 계산.
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ series: string; path: string[] }> }) {
  const { path: segments } = await params

  // path traversal 방지
  const joined = segments.join('/')
  if (joined.includes('..') || segments.some(s => s.includes('..'))) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
  const filePath = path.join(REMOTION_ROOT, 'out', ...segments)
  if (!existsSync(filePath) || !filePath.endsWith('.png')) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const stream = createReadStream(filePath)
  const webStream = Readable.toWeb(stream) as ReadableStream

  return new Response(webStream, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
