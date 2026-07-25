import { isSeriesModel } from '@/lib/series-registry'
import { factionVoiceFilePath } from '@/lib/faction-utils'
import { streamWav } from '@/lib/episode-store'

/**
 * GET /api/{series}/faction-voice/{episode}/{file}
 * 인물 대사 wav 한 개를 스트리밍한다(재생용). Range 요청 지원.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ series: string; episode: string; file: string }> },
) {
  const { series, episode, file } = await params
  if (!isSeriesModel(series, 'faction')) {
    return Response.json({ error: 'invalid series' }, { status: 404 })
  }
  return streamWav(req, factionVoiceFilePath(decodeURIComponent(episode), decodeURIComponent(file)))
}
