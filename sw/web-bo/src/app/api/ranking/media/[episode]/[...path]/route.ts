/**
 * 랭킹 사진·영상 서빙 — GET /api/ranking/media/{에피소드}/{경로}
 *
 * 공용 부품의 `imageSrc('ranking', 에피소드, 파일)` 이 만드는 주소와 같은 규칙이다.
 */

import { NextResponse } from 'next/server'
import { imageAbsPath, readImageFile, RANKINGS_DIR } from '@feelandnote/shared/bo/episode-store'
import { guardRankingRoute } from '@/lib/ranking-route'

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
  { params }: { params: Promise<{ episode: string; path: string[] }> },
) {
  const denied = await guardRankingRoute()
  if (denied) return denied

  const { episode, path: parts } = await params
  const file = (parts ?? []).join('/')
  if (!episode || !file) return new NextResponse('bad request', { status: 400 })

  const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
  if (!MIME[ext]) return new NextResponse('unsupported type', { status: 400 })

  const buf = await readImageFile(imageAbsPath(RANKINGS_DIR, decodeURIComponent(episode), file))
  if (!buf) return new NextResponse('not found', { status: 404 })

  return new NextResponse(new Uint8Array(buf), {
    headers: { 'Content-Type': MIME[ext], 'Cache-Control': 'no-cache' },
  })
}
