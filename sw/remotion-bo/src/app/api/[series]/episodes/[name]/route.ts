import { NextResponse } from 'next/server'
import { loadEpisode, loadCandidate, saveEpisode, type SaveScope } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

export async function GET(_req: Request, { params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  try {
    let ep
    try { ep = await loadEpisode(series, name) }
    catch { ep = await loadCandidate(series, name) }
    return NextResponse.json(ep)
  } catch { return NextResponse.json({ error: 'not found' }, { status: 404 }) }
}

export async function PUT(req: Request, { params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  try {
    // scope — 어떤 파일군만 기록할지 한정. 미지정/이상값은 'all'(현행 전체 저장).
    const url = new URL(req.url)
    const raw = url.searchParams.get('scope')
    const scope: SaveScope = raw === 'longform' || raw === 'shorts' ? raw : 'all'
    // books — 부분 저장: 변경된 책 인덱스만 기록(동시편집/외부수정 보존). 미지정이면 전체.
    const booksRaw = url.searchParams.get('books')
    const bookIndices = booksRaw !== null
      ? booksRaw.split(',').filter(s => s.trim() !== '').map(s => Number(s)).filter(n => Number.isInteger(n) && n >= 0)
      : undefined
    const body = await req.json()
    await saveEpisode(series, name, body, scope, bookIndices)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
