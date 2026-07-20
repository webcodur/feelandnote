/**
 * GET /api/{series}/discourse-voice/{episode}
 *
 * 에피소드 voice/ 폴더의 발언 음원 wav 목록(파일명·크기·길이)을 반환한다.
 * 편집기는 이 목록을 발언 배열과 대조해 **음원 자리가 밀렸는지** 잡는다(discourse-voice.ts vnVerify).
 * 발언을 중간에 넣거나 옮기면 뒤 발언의 번호가 한 칸씩 밀리는데, 그 사고를 화면에서 바로 드러내기 위한 창구다.
 */
import { NextResponse } from 'next/server'
import { isSeriesModel } from '@/lib/series-registry'
import { listDiscourseVoices } from '@/lib/discourse-utils'

export async function GET(_req: Request, { params }: { params: Promise<{ series: string; episode: string }> }) {
  const { series, episode } = await params
  if (!isSeriesModel(series, 'discourse')) {
    return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  }
  const files = await listDiscourseVoices(decodeURIComponent(episode))
  return NextResponse.json(
    { files },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
  )
}
