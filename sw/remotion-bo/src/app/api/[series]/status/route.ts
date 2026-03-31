import { NextResponse } from 'next/server'
import { listEpisodes, moveEpisode } from '@/lib/server-utils'
import type { EpisodeStatus } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

const VALID_STATUSES: EpisodeStatus[] = ['todo', 'live', 'done']

/** GET: 전체 상태 맵 (폴더 구조 기반) */
export async function GET(_req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  const items = await listEpisodes(series)
  const map: Record<string, EpisodeStatus> = {}
  for (const { id, status } of items) map[id] = status
  return NextResponse.json(map)
}

/** PUT: 에피소드 상태 변경 (폴더 이동) */
export async function PUT(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { name, status } = await req.json() as { name: string; status: EpisodeStatus }
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 })

  try {
    await moveEpisode(name, status)
    return NextResponse.json({ ok: true, name, status })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
