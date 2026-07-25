import { NextResponse } from 'next/server'
import { loadEpisode, saveEpisode } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'
import { shortsArrIndexBySlot } from '@feelandnote/shared/bo/voice-utils'

/**
 * PATCH /api/[series]/episodes/[name]/segment
 *
 * 쇼츠 구간 단위 부분 저장. 디스크의 최신 에피소드를 읽어 들여
 * 지정된 구간만 교체한 뒤 다시 저장한다. 다른 탭·세션이 방금 바꾼
 * 내용(다른 구간·다른 필드)은 보존된다.
 *
 * body: { shortsIndex: number (고정 slot), segmentId: string, segment: object }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  try {
    const body = await req.json()
    const { shortsIndex, segmentId, segment } = body as { shortsIndex?: number; segmentId?: string; segment?: Record<string, unknown> }
    if (typeof shortsIndex !== 'number' || typeof segmentId !== 'string' || !segment || typeof segment !== 'object') {
      return NextResponse.json({ error: 'shortsIndex(number), segmentId(string), segment(object) required' }, { status: 400 })
    }

    const ep = await loadEpisode(series, name) as Record<string, unknown>
    const isArr = Array.isArray(ep.shorts)
    const shortsArr = (isArr ? ep.shorts : (ep.shorts ? [ep.shorts] : [])) as Array<{ slot?: number; segments?: Array<{ id?: string }> }>
    // shortsIndex 는 고정 slot 번호다(배열 위치 아님). slot 으로 위치를 찾는다.
    const target = shortsArr[shortsArrIndexBySlot(shortsArr, shortsIndex)]
    if (!target) {
      return NextResponse.json({ error: `shorts slot ${shortsIndex} not found` }, { status: 404 })
    }

    const segs = target.segments
    if (!Array.isArray(segs)) {
      return NextResponse.json({ error: 'segments missing' }, { status: 400 })
    }

    const idx = segs.findIndex(s => s?.id === segmentId)
    if (idx < 0) {
      return NextResponse.json({ error: `segment id "${segmentId}" not found` }, { status: 404 })
    }

    segs[idx] = segment as { id?: string }
    const nextShorts = isArr ? shortsArr : shortsArr[0]
    await saveEpisode(series, name, { ...ep, shorts: nextShorts })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
