/**
 * 배경음악 한 곡 내주기 — GET /api/faction/music/{파일명}
 *
 * 편집 화면이 곡을 미리 듣고 길이를 재는 데 쓴다. 대상은 시리즈 공용 배경음악 폴더
 * (sw/remotion/public/music/) 하나뿐이다 — 에피소드 폴더와 무관하다.
 *
 * 신설: 옛 대시보드의 같은 자리 창구(`[series]/music/[...path]`)는 북리커맨드 에피소드 폴더를
 *   찾아 들어가는 구조라 그대로 옮길 수 없었다. 대신 팩션 전용 곡 서빙 창구
 *   (`[series]/faction-music/[file]`)의 동작을 살리고, 경로 잠금은 자산 창구
 *   (`lib/faction-asset`)와 같은 두 겹 방식으로 짰다.
 *
 * ⚠ 두 겹으로 잠근다 — 순서를 바꾸거나 빼지 마라.
 *   1. `..`·절대경로·빈 토막을 걷어낸 뒤, 결과가 음악 폴더 안쪽인지 다시 확인한다.
 *   2. 소리 확장자 허용 목록 — 목록에 없으면 내주지 않는다.
 */

import { NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { safeRelSegs } from '@feelandnote/shared/bo/episode-store'
import { guardFactionRoute } from '@/lib/faction-route'
import { MUSIC_DIR } from '@/lib/faction-file-utils'

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
}

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { path: parts } = await params
  // 세그먼트별 디코딩 — 한글·공백 파일명은 인코딩된 채 넘어온다
  const rel = (parts ?? []).map(s => { try { return decodeURIComponent(s) } catch { return s } }).join('/')
  const segs = safeRelSegs(rel)
  if (!segs.length) return new NextResponse('bad request', { status: 400 })

  const base = path.resolve(MUSIC_DIR)
  const abs = path.resolve(base, ...segs)
  // safeRelSegs 가 '..' 을 걷어내지만, 이상한 입력까지 감당하도록 결과를 다시 확인한다
  if (!abs.startsWith(base + path.sep)) return new NextResponse('뿌리 폴더 밖입니다', { status: 403 })

  const mime = MIME[path.extname(abs).toLowerCase()]
  if (!mime) return new NextResponse('내줄 수 없는 확장자입니다', { status: 400 })

  try {
    if (!(await stat(abs)).isFile()) return new NextResponse('not found', { status: 404 })
    const buf = await readFile(abs)
    return new NextResponse(new Uint8Array(buf), {
      headers: { 'Content-Type': mime, 'Cache-Control': 'no-cache' },
    })
  } catch {
    return new NextResponse('not found', { status: 404 })
  }
}
