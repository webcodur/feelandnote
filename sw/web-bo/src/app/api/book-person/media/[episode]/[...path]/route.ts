import { NextResponse } from 'next/server'
import { imageAbsPath, readImageFile } from '@feelandnote/shared/bo/episode-store'
import { BOOK_PERSON_DIR } from '@/lib/book-person-paths'
import { guardBookPersonRoute } from '@/lib/book-person-route'

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
  const denied = await guardBookPersonRoute()
  if (denied) return denied

  const { episode, path: parts } = await params
  const file = (parts ?? []).join('/')
  if (!episode || !file) return new NextResponse('bad request', { status: 400 })

  const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
  if (!MIME[ext]) return new NextResponse('unsupported type', { status: 400 })

  const buf = await readImageFile(imageAbsPath(BOOK_PERSON_DIR, decodeURIComponent(episode), file))
  if (!buf) return new NextResponse('not found', { status: 404 })

  return new NextResponse(new Uint8Array(buf), {
    headers: { 'Content-Type': MIME[ext], 'Cache-Control': 'no-cache' },
  })
}
