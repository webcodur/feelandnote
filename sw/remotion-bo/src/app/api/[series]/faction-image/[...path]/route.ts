import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { isValidSeries, isFactionSeries } from '@/lib/series-registry'
import { factionImageAbsPath } from '@/lib/faction-utils'

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

/** GET /api/{series}/faction-image/{ep}/{file} : 이미지 파일 서빙 */
export async function GET(_req: Request, { params }: { params: Promise<{ series: string; path: string[] }> }) {
  const { series, path: parts } = await params
  if (!isValidSeries(series) || !isFactionSeries(series)) {
    return new NextResponse('not found', { status: 404 })
  }
  const [ep, ...rest] = parts
  const file = rest.join('/') // 폴더 경로(예 '1/앨런 튜링.webp') 보존
  if (!ep || !file) return new NextResponse('bad request', { status: 400 })
  try {
    const buf = await readFile(factionImageAbsPath(ep, file))
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
