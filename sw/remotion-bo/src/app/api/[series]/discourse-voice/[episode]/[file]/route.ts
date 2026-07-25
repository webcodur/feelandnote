/**
 * GET /api/{series}/discourse-voice/{episode}/{file}
 * 발언 음원 wav 한 개를 스트리밍한다(미리듣기). Range 요청 지원.
 */
import { isSeriesModel } from '@/lib/series-registry'
import { discourseVoiceFilePath } from '@/lib/discourse-utils'
import { streamWav } from '@/lib/episode-store'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ series: string; episode: string; file: string }> },
) {
  const { series, episode, file } = await params
  if (!isSeriesModel(series, 'discourse')) {
    return Response.json({ error: 'invalid series' }, { status: 404 })
  }
  return streamWav(req, discourseVoiceFilePath(decodeURIComponent(episode), decodeURIComponent(file)))
}
