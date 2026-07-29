import { NextResponse } from 'next/server'
import { getVoiceStorageStatus, loadVoiceFiles, unloadVoiceFiles } from '@/features/book-recommend/lib/server-utils'
import { isValidSeries } from '@/features/book-recommend/lib/series-registry'

export async function GET(_req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  const data = await getVoiceStorageStatus()
  return NextResponse.json(data)
}

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  try {
    const body = await req.json() as { action: 'load' | 'unload'; episodes: string[] }
    const { action, episodes } = body

    if (!action || !episodes?.length) {
      return NextResponse.json({ error: 'action과 episodes 필수' }, { status: 400 })
    }

    const results = action === 'unload'
      ? await unloadVoiceFiles(episodes)
      : await loadVoiceFiles(episodes)

    const updated = await getVoiceStorageStatus()
    return NextResponse.json({ results, ...updated })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[voice/storage POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
