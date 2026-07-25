/**
 * 에피소드 사진·영상 파일 서빙 — GET /api/{series}/media/{ep}/{경로}
 *
 * 편집 중에 파일을 갈아 끼우면 화면에 바로 보여야 하므로 캐시를 두지 않는다.
 */

import { NextResponse } from 'next/server'
import { imageAbsPath, readImageFile } from '@feelandnote/shared/bo/episode-store'
import { mediaRootOf } from '@/lib/media-root'

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ series: string; episode: string; path: string[] }> },
) {
  const { series, episode, path: parts } = await params
  const root = mediaRootOf(series)
  if (!root) return new NextResponse('not found', { status: 404 })

  const file = (parts ?? []).join('/') // 하위 폴더 경로(예 '1/앨런 튜링.webp') 보존
  if (!episode || !file) return new NextResponse('bad request', { status: 400 })

  const buf = await readImageFile(imageAbsPath(root, episode, file))
  if (!buf) return new NextResponse('not found', { status: 404 })

  const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
