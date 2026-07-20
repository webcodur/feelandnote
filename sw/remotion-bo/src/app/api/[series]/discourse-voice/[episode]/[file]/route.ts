/**
 * GET /api/{series}/discourse-voice/{episode}/{file}
 * 발언 음원 wav 한 개를 스트리밍한다(미리듣기). 같은 파일명에 새 음원을 덮어써도
 * 옛 음성이 들리지 않도록 캐시를 금지한다. (팩션 faction-voice/[episode]/[file] 과 같은 규격)
 */
import { stat, open } from 'fs/promises'
import { isSeriesModel } from '@/lib/series-registry'
import { discourseVoiceFilePath } from '@/lib/discourse-utils'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ series: string; episode: string; file: string }> },
) {
  const { series, episode, file } = await params
  if (!isSeriesModel(series, 'discourse')) {
    return Response.json({ error: 'invalid series' }, { status: 404 })
  }
  const abs = discourseVoiceFilePath(decodeURIComponent(episode), decodeURIComponent(file))

  try {
    const fileStat = await stat(abs)
    const fileSize = fileStat.size
    const range = req.headers.get('range')
    const match = range?.match(/bytes=(\d+)-(\d*)/)

    const start = match ? parseInt(match[1]) : 0
    const end = match && match[2] ? parseInt(match[2]) : fileSize - 1
    const chunkSize = end - start + 1

    const fh = await open(abs, 'r')
    const buf = Buffer.alloc(chunkSize)
    await fh.read(buf, 0, chunkSize, start)
    await fh.close()

    return new Response(new Uint8Array(buf), {
      status: match ? 206 : 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(chunkSize),
        ...(match ? { 'Content-Range': `bytes ${start}-${end}/${fileSize}` } : {}),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch {
    return Response.json({ error: 'not found' }, { status: 404 })
  }
}
