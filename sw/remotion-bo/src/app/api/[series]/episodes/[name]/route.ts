import { NextResponse } from 'next/server'
import { loadEpisode, loadCandidate, saveEpisode } from '@/lib/server-utils'
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
    const body = await req.json()
    await saveEpisode(series, name, body)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
