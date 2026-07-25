import { NextResponse } from 'next/server'
import { existsSync, mkdirSync } from 'fs'
import { spawn } from 'child_process'
import path from 'path'
import { guardFactionRoute } from '@/lib/faction-route'
import { listMusicWithUsage, MUSIC_DIR } from '@/lib/faction-file-utils'

/** GET : public/music/ 의 음악 파일 목록 + 각 곡의 연결처(세력명) */
export async function GET() {
  const denied = await guardFactionRoute()
  if (denied) return denied
  return NextResponse.json(await listMusicWithUsage())
}

/** POST : 음악 폴더(public/music)를 OS 탐색기로 연다. 없으면 만들어 둔다. */
export async function POST() {
  const denied = await guardFactionRoute()
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
