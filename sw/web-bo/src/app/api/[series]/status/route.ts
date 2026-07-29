import { NextResponse } from 'next/server'
import { listEpisodes, moveEpisode } from '@/features/book-recommend/lib/server-utils'
import type { EpisodeStatus } from '@/features/book-recommend/lib/server-utils'
import { isValidSeries, seriesDataModel, type SeriesDataModel } from '@/features/book-recommend/lib/series-registry'

const VALID_STATUSES: EpisodeStatus[] = ['todo', 'live', 'done']

/**
 * 별도 저장소가 상태를 관리하는 계열의 등록표.
 * 표에 없는 서재 탐방은 `moveEpisode`가 신구조의 `_status.json`을 갱신하고,
 * 옛 구조에 한해서만 legacy status 폴더를 이동한다.
 *
 * ⚠ 26.07.26 현재 표가 비었다 — 유일한 항목이던 가상 담화가 web-bo 로 이관됐다.
 */
const STATUS_WRITERS: Partial<Record<SeriesDataModel, (name: string, status: EpisodeStatus) => Promise<void>>> = {}

/** GET: 전체 상태 맵 (폴더 구조 기반) */
export async function GET(_req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  const items = await listEpisodes(series)
  const map: Record<string, EpisodeStatus> = {}
  for (const { id, status } of items) map[id] = status
  return NextResponse.json(map)
}

/** PUT: 에피소드 상태 변경 */
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
