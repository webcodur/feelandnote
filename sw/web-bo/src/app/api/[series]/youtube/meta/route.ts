import { NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { REMOTION_ROOT } from '@feelandnote/shared/bo/remotion-root'
import { getSeriesById } from '@/features/book-recommend/lib/series-registry'
import { toPascal } from '@/features/book-recommend/lib/server-utils'

// 실행 시점에만 도는 동적 라우트(렌더 산출물 out/ 을 fs로 읽고 씀). 빌드 타임 정적 분석·prerender 대상이 아님.
// 경로 상수를 모듈 최상위에 두면 Turbopack이 out/ 디렉토리를 번들 자산으로 추적하다 깨진다 → 핸들러 내부에서 런타임 계산.
export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!getSeriesById(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const url = new URL(req.url)
  const episode = url.searchParams.get('episode')
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  const label = toPascal(episode)
  const metaPath = path.join(REMOTION_ROOT, 'out', label, 'youtube-meta.json')

  try {
    if (!existsSync(metaPath)) return NextResponse.json(null)
    const data = JSON.parse(await readFile(metaPath, 'utf-8'))
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(null)
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!getSeriesById(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const url = new URL(req.url)
  const episode = url.searchParams.get('episode')
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  const body = await req.json()
  const label = toPascal(episode)
  const outDir = path.join(REMOTION_ROOT, 'out', label)
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'youtube-meta.json'), JSON.stringify(body, null, 2) + '\n', 'utf-8')
  return NextResponse.json({ ok: true })
}
