/**
 * 가상 담화 사진·영상 서빙 — GET /api/discourse/media/{에피소드}/{경로}
 *
 * 공용 부품의 `imageSrc('discourse', 에피소드, 파일)` 이 만드는 주소와 같은 규칙이다.
 * 편집 중에 파일을 갈아 끼우면 화면에 바로 보여야 하므로 캐시를 두지 않는다.
 */

import { NextResponse } from 'next/server'
import { imageAbsPath, readImageFile } from '@feelandnote/shared/bo/episode-store'
import { DISCOURSES_DIR } from '@/lib/discourse-paths'
import { guardDiscourseRoute } from '@/lib/discourse-route'
import { paramToFolder } from '@/lib/discourse-edit-route'

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
  const denied = await guardDiscourseRoute()
  if (denied) return denied

  const { episode, path: parts } = await params
  const file = (parts ?? []).join('/') // 하위 폴더 경로(예 'cast/elon-musk/01.png') 보존
  if (!episode || !file) return new NextResponse('bad request', { status: 400 })

  const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
  if (!MIME[ext]) return new NextResponse('unsupported type', { status: 400 })

  const buf = await readImageFile(imageAbsPath(DISCOURSES_DIR, paramToFolder(episode), file))
  if (!buf) return new NextResponse('not found', { status: 404 })

  return new NextResponse(new Uint8Array(buf), {
    headers: { 'Content-Type': MIME[ext], 'Cache-Control': 'no-cache' },
  })
}
