import { streamWav } from '@feelandnote/shared/bo/episode-store'
import { discourseVoiceFilePath } from '@/lib/discourse-paths'
import { guardDiscourseRoute } from '@/lib/discourse-route'
import { paramToFolder } from '@/lib/discourse-edit-route'

/**
 * GET /api/discourse/voice/{에피소드}/{파일}
 * 발언 wav 한 개를 스트리밍한다(재생용). 구간 요청(Range) 지원.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ episode: string; file: string }> },
) {
  const denied = await guardDiscourseRoute()
  if (denied) return denied

  const { episode, file } = await params
  const name = decodeURIComponent(file)
  if (!/\.wav$/i.test(name)) return Response.json({ error: 'wav only' }, { status: 400 })
  return streamWav(req, discourseVoiceFilePath(paramToFolder(episode), name))
}
