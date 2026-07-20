import { NextResponse } from 'next/server'
import { isSeriesModel } from '@/lib/series-registry'
import { deleteFactionEpisode, duplicateFactionEpisode } from '@/lib/faction-utils'

function guard(series: string) {
  return isSeriesModel(series, 'faction')
}

/** DELETE ?ep= : 에피소드 폴더 통째 삭제 */
export async function DELETE(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  const ep = new URL(req.url).searchParams.get('ep')
  if (!ep) return NextResponse.json({ error: 'ep required' }, { status: 400 })
  await deleteFactionEpisode(ep)
  return NextResponse.json({ ok: true })
}

/** POST { action: 'duplicate'|'rename', src, dst } */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  const { action, src, dst } = await req.json()
  if (!src?.trim() || !dst?.trim()) return NextResponse.json({ error: 'src and dst required' }, { status: 400 })
  try {
    await duplicateFactionEpisode(src.trim(), dst.trim())
    if (action === 'rename') await deleteFactionEpisode(src.trim())
    return NextResponse.json({ ok: true, name: dst.trim() })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const status = msg.includes('already exists') ? 409 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
