import { stat, open } from 'fs/promises'
import path from 'path'
import { existsSync, readFileSync } from 'fs'
import { VOICE_DIR } from '@/lib/server-utils'

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params

  // 직접 경로 시도
  let abs = path.join(VOICE_DIR, ...segments)

  // 없으면 voice-select.json으로 엔진 하위 디렉토리 해소
  if (!existsSync(abs) && segments.length >= 2) {
    const epName = segments[0]
    const fileName = segments.slice(1).join('/')
    const vsPath = path.join(VOICE_DIR, epName, 'voice-select.json')
    if (existsSync(vsPath)) {
      try {
        const vs = JSON.parse(readFileSync(vsPath, 'utf-8'))
        const engine = vs.slots?.[fileName] ?? vs.default
        if (engine) {
          const resolved = path.join(VOICE_DIR, epName, engine, fileName)
          if (existsSync(resolved)) abs = resolved
        }
      } catch { /* ignore */ }
    }
  }

  try {
    const fileStat = await stat(abs)
    const fileSize = fileStat.size
    const range = req.headers.get('range')

    if (range) {
      // Range 요청 처리 — seek 지원
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
          },
        })
      }
    }

    // 전체 응답
    const fh = await open(abs, 'r')
    const buf = Buffer.alloc(fileSize)
    await fh.read(buf, 0, fileSize, 0)
    await fh.close()

    return new Response(buf, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
      },
    })
  } catch {
    return Response.json({ error: 'not found' }, { status: 404 })
  }
}
