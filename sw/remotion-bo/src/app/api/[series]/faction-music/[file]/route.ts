import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { isValidSeries, isFactionSeries } from '@/lib/series-registry'
import { MUSIC_DIR } from '@/lib/faction-utils'

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
}

/** GET /api/{series}/faction-music/{file} : 음악 파일 서빙 (재생·길이 측정용) */
export async function GET(_req: Request, { params }: { params: Promise<{ series: string; file: string }> }) {
  const { series, file: raw } = await params
  if (!isValidSeries(series) || !isFactionSeries(series)) {
    return new NextResponse('not found', { status: 404 })
  }
  // basename으로 경로 이탈 차단 (한글·공백 파일명은 그대로 보존)
  const file = path.basename(decodeURIComponent(raw))
  if (!file) return new NextResponse('bad request', { status: 400 })
  try {
    const buf = await readFile(path.join(MUSIC_DIR, file))
    const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      },
    })
  } catch {
    return new NextResponse('not found', { status: 404 })
  }
}
