import { stat, open } from 'fs/promises'
import { isValidSeries, isFactionSeries } from '@/lib/series-registry'
import { factionVoiceFilePath } from '@/lib/faction-utils'

/**
 * GET /api/{series}/faction-voice/{episode}/{file}
 * 인물 대사 wav 한 개를 스트리밍한다(재생용). Range 요청 지원.
 * 같은 파일명에 새 음원을 덮어써도 옛 음성이 캐시되지 않도록 캐시를 금지한다.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ series: string; episode: string; file: string }> },
) {
  const { series, episode, file } = await params
  if (!isValidSeries(series) || !isFactionSeries(series)) {
    return Response.json({ error: 'invalid series' }, { status: 404 })
  }
  const abs = factionVoiceFilePath(decodeURIComponent(episode), decodeURIComponent(file))

  try {
    const fileStat = await stat(abs)
    const fileSize = fileStat.size
    const range = req.headers.get('range')

    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        const start = parseInt(match[1])
        const end = match[2] ? parseInt(match[2]) : fileSize - 1
        const chunkSize = end - start + 1
        const fh = await open(abs, 'r')
        const buf = Buffer.alloc(chunkSize)
        await fh.read(buf, 0, chunkSize, start)
        await fh.close()
        return new Response(buf, {
          status: 206,
          headers: {
            'Content-Type': 'audio/wav',
            'Content-Length': String(chunkSize),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        })
      }
    }

    const fh = await open(abs, 'r')
    const buf = Buffer.alloc(fileSize)
    await fh.read(buf, 0, fileSize, 0)
    await fh.close()
    return new Response(buf, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch {
    return Response.json({ error: 'not found' }, { status: 404 })
  }
}
