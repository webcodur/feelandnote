/**
 * 가상 담화 자산 서빙 — GET /api/discourse/asset/{public/discourses 기준 상대경로}
 *
 * 사진 창구(`../media/{에피소드}/{경로}`)는 에피소드 안쪽만 다룬다. 이 창구는 그보다 넓게
 * `public/discourses/` 아래 아무 자산이나 내준다 — 참고 자료·배경처럼 에피소드 폴더 밖에 있는
 * 파일, 그리고 음원(wav)까지 편집 화면에서 바로 열어보기 위한 창구다.
 *
 * ⚠ 이 주소는 이미지 확장자로 끝나면 앱의 진입 검사를 건너뛴다(`src/proxy.ts` matcher).
 *   그래서 아래 두 줄이 유일한 방어다 — 순서를 바꾸거나 빼지 마라.
 *   경로 잠금 규칙은 `lib/discourse-asset` 소유다.
 */

import { NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { streamWav } from '@feelandnote/shared/bo/episode-store'
import { resolveDiscourseAsset } from '@/lib/discourse-asset'
import { DISCOURSES_DIR } from '@/lib/discourse-paths'
import { guardDiscourseRoute } from '@/lib/discourse-route'

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const denied = await guardDiscourseRoute()
  if (denied) return denied

  const { path: parts } = await params
  const rel = (parts ?? []).map(s => { try { return decodeURIComponent(s) } catch { return s } }).join('/')
  const r = resolveDiscourseAsset(DISCOURSES_DIR, rel)
  if (!r.ok) return new NextResponse(r.reason, { status: r.status })

  // 음원은 재생 중 구간 요청(Range)이 오므로 스트리밍 창구로 넘긴다
  if (r.ext === '.wav') return streamWav(req, r.abs)

  try {
    if (!(await stat(r.abs)).isFile()) return new NextResponse('not found', { status: 404 })
    const buf = await readFile(r.abs)
    return new NextResponse(new Uint8Array(buf), {
      headers: { 'Content-Type': r.mime, 'Cache-Control': 'no-cache' },
    })
  } catch {
    return new NextResponse('not found', { status: 404 })
  }
}
