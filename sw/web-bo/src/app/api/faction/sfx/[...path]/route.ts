/** 공용 효과음 한 곡 내주기 — GET /api/faction/sfx/{파일명} */

import { NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { safeRelSegs } from '@feelandnote/shared/bo/episode-store'
import { guardFactionRoute } from '@/lib/faction-route'
import { SFX_DIR } from '@/lib/faction-file-utils'

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
}

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { path: parts } = await params
  const rel = (parts ?? []).map(segment => {
    try { return decodeURIComponent(segment) } catch { return segment }
  }).join('/')
  const segs = safeRelSegs(rel)
  if (!segs.length) return new NextResponse('bad request', { status: 400 })

  const base = path.resolve(SFX_DIR)
  const abs = path.resolve(base, ...segs)
  if (!abs.startsWith(base + path.sep)) return new NextResponse('뿌리 폴더 밖입니다', { status: 403 })

  const mime = MIME[path.extname(abs).toLowerCase()]
  if (!mime) return new NextResponse('내줄 수 없는 확장자입니다', { status: 400 })

  try {
    if (!(await stat(abs)).isFile()) return new NextResponse('not found', { status: 404 })
    const buffer = await readFile(abs)
    return new NextResponse(new Uint8Array(buffer), {
      headers: { 'Content-Type': mime, 'Cache-Control': 'no-cache' },
    })
  } catch {
    return new NextResponse('not found', { status: 404 })
  }
}
