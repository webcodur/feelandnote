/**
 * 배경음악 목록 — GET /api/discourse/music
 *
 * 대상은 시리즈 공용 배경음악 폴더(sw/remotion/public/music/) 하나뿐이다.
 * 편집기는 이 목록에서 곡을 고른다(응답은 `{ files }` — 편집기가 배열·객체 둘 다 받는다).
 *
 * POST 는 음악 폴더를 OS 탐색기로 연다.
 */

import { NextResponse } from 'next/server'
import { existsSync, mkdirSync } from 'fs'
import { readdir } from 'fs/promises'
import { spawn } from 'child_process'
import path from 'path'
import { guardDiscourseRoute } from '@/lib/discourse-route'
import { MUSIC_DIR } from '@/lib/discourse-paths'

export async function GET() {
  const denied = await guardDiscourseRoute()
  if (denied) return denied
  let files: string[] = []
  try {
    files = (await readdir(MUSIC_DIR)).filter(f => /\.(mp3|wav|m4a|ogg)$/i.test(f)).sort()
  } catch { files = [] }
  return NextResponse.json({ files })
}

/** POST : 음악 폴더(public/music)를 OS 탐색기로 연다. 없으면 만들어 둔다. */
export async function POST() {
  const denied = await guardDiscourseRoute()
  if (denied) return denied
  if (!existsSync(MUSIC_DIR)) {
    try { mkdirSync(MUSIC_DIR, { recursive: true }) } catch { /* ignore */ }
  }
  const platform = process.platform
  const cmd = platform === 'win32' ? 'explorer' : platform === 'darwin' ? 'open' : 'xdg-open'
  // 탐색기는 띄우고 즉시 분리한다(explorer 는 정상이어도 종료 코드 1을 반환할 수 있어 무시).
  const child = spawn(cmd, [path.normalize(MUSIC_DIR)], { detached: true, stdio: 'ignore' })
  child.unref()
  return NextResponse.json({ ok: true })
}
