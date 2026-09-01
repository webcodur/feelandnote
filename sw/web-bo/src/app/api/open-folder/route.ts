import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import { EPISODES_DIR } from '@/features/book-recommend/lib/server-utils'
import { ASSET_ARCHIVE_ROOT } from '@feelandnote/shared/bo/asset-archive'

/** 열 수 있는 폴더 — 임의 경로 차단을 위해 고정 목록만 허용. 보관소는 자산 보관소의 서재 탐방 자리다. */
const TARGETS: Record<string, string> = {
  episodes: EPISODES_DIR,
  archive: path.join(ASSET_ARCHIVE_ROOT, 'episodes'),
}

/** OS 파일 탐색기로 폴더를 연다. target=episodes(작업 중) | archive(보관소) */
export async function POST(req: Request) {
  const { target = 'episodes' } = await req.json().catch(() => ({}))
  const dir = TARGETS[target]
  if (!dir) return NextResponse.json({ error: 'invalid target' }, { status: 400 })

  // 보관소 폴더가 아직 없으면 만들어 둔다 — 완료 인물을 옮겨둘 대상 폴더.
  if (!existsSync(dir)) {
    try { mkdirSync(dir, { recursive: true }) } catch { /* ignore */ }
  }

  const normalized = path.normalize(dir)
  const platform = process.platform
  const cmd = platform === 'win32' ? 'explorer' : platform === 'darwin' ? 'open' : 'xdg-open'

  // 탐색기는 띄우고 즉시 분리한다(explorer 는 정상이어도 종료 코드 1을 반환할 수 있어 무시).
  const child = spawn(cmd, [normalized], { detached: true, stdio: 'ignore' })
  child.unref()

  return NextResponse.json({ ok: true, dir: normalized })
}
