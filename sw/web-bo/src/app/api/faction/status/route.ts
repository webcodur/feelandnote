import { NextResponse } from 'next/server'
import { guardFactionRoute } from '@/lib/faction-route'
import {
  listFactionEpisodes, setFactionEpisodeStatus, type FactionEpisodeStatus,
} from '@/actions/admin/factions/episodes'

/**
 * 세력도 진행 상태 창구.
 *
 * 교체: 옛 대시보드는 편 폴더를 훑어 `_status.json` 파일을 읽고 썼다(북리커맨드는 폴더 이동).
 *   이제 진행 상태의 원본은 DB(faction_episodes.status)다 — 파일을 건드리지 않는다.
 *   북리커맨드(폴더 이동)·담화 분기는 이 앱에 없어 버렸다.
 */

const VALID_STATUSES: FactionEpisodeStatus[] = ['ready', 'blocked']

/** GET: 전체 상태 맵 (편 폴더명 → 진행 상태) */
export async function GET() {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const items = await listFactionEpisodes()
  const map: Record<string, FactionEpisodeStatus> = {}
  for (const { folder, status } of items) map[folder] = status
  return NextResponse.json(map)
}

/** PUT: 에피소드 상태 변경 */
export async function PUT(req: Request) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { name, status } = await req.json() as { name: string; status: FactionEpisodeStatus }
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 })

  try {
    await setFactionEpisodeStatus(name, status)
    return NextResponse.json({ ok: true, name, status })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
