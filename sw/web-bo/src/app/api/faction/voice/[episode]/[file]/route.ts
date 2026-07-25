import { streamWav } from '@feelandnote/shared/bo/episode-store'
import { factionVoiceFilePath } from '@/lib/faction-paths'
import { guardFactionRoute } from '@/lib/faction-route'

/**
 * GET /api/faction/voice/{에피소드}/{파일}
 * 인물 대사 wav 한 개를 스트리밍한다(재생용). 구간 요청(Range) 지원.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ episode: string; file: string }> },
) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode, file } = await params
  const name = decodeURIComponent(file)
  if (!/\.wav$/i.test(name)) return Response.json({ error: 'wav only' }, { status: 400 })
  return streamWav(req, factionVoiceFilePath(decodeURIComponent(episode), name))
}
