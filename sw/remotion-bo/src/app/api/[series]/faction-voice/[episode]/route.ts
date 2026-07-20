import { NextResponse } from 'next/server'
import { isSeriesModel } from '@/lib/series-registry'
import { listFactionVoices } from '@/lib/faction-utils'

/**
 * GET /api/{series}/faction-voice/{episode}
 * 에피소드 voice/ 폴더의 인물 대사 wav 목록(파일명·크기·길이)을 반환한다.
 * UI가 인물별 음성 존재 여부·길이를 표시하는 데 쓴다.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ series: string; episode: string }> }) {
  const { series, episode } = await params
  if (!isSeriesModel(series, 'faction')) {
    return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  }
  const files = await listFactionVoices(decodeURIComponent(episode))
  return NextResponse.json(
    { files },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
  )
}
