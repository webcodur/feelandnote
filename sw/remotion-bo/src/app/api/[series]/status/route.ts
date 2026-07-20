import { NextResponse } from 'next/server'
import { listEpisodes, moveEpisode } from '@/lib/server-utils'
import type { EpisodeStatus } from '@/lib/server-utils'
import { isValidSeries, seriesDataModel, type SeriesDataModel } from '@/lib/series-registry'
import { writeFactionStatus } from '@/lib/faction-utils'
import type { FactionStatus } from '@/lib/faction-types'
import { writeDiscourseStatus } from '@/lib/discourse-utils'
import type { DiscourseStatus } from '@/lib/discourse-types'

const VALID_STATUSES: EpisodeStatus[] = ['todo', 'live', 'done']

/**
 * 세력도·담화는 폴더 이동 없이 _status.json 파일로 상태를 관리한다.
 * 표에 없는 계열(book)만 인물 폴더를 옛 status 폴더로 옮긴다.
 */
const STATUS_WRITERS: Partial<Record<SeriesDataModel, (name: string, status: EpisodeStatus) => Promise<void>>> = {
  faction: (name, status) => writeFactionStatus(name, status as FactionStatus),
  discourse: (name, status) => writeDiscourseStatus(name, status as DiscourseStatus),
}

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
    const model = seriesDataModel(series)
    const write = model ? STATUS_WRITERS[model] : undefined
    if (write) await write(name, status)
    else await moveEpisode(name, status)
    return NextResponse.json({ ok: true, name, status })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
