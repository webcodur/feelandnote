/**
 * remotion 워크스페이스의 public 자산(책 표지·인물 사진 등)을 remotion-bo 화면에서 띄우기 위한 통로.
 * BookCard 미리보기에서 assetBase='/api/rm-asset' 로 참조한다.
 * 예: /api/rm-asset/episodes/abraham-lincoln/ref/cover-082.jpg
 */
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname, extname, normalize, isAbsolute } from 'path'
import { createRequire } from 'module'
import { NextResponse, type NextRequest } from 'next/server'

const req = createRequire(import.meta.url)

/**
 * remotion 워크스페이스 public 폴더 위치.
 * Turbopack dev 는 req.resolve 결과를 '[project]/...' 로 마스킹해 절대경로가 깨진다 — 절대경로일 때만 신뢰하고,
 * 아니면 BO(remotion-bo)와 형제인 remotion 워크스페이스를 cwd 기준으로 찾는다(실행 위치에 따라 두 후보를 검사).
 */
const REMOTION_PUBLIC = (() => {
  const candidates: string[] = []
  try {
    const resolved = req.resolve('@feelandnote/remotion/package.json')
    if (isAbsolute(resolved)) candidates.push(join(dirname(resolved), 'public'))
  } catch { /* fall through */ }
  candidates.push(join(process.cwd(), '..', 'remotion', 'public')) // cwd = sw/remotion-bo 에서 실행
  candidates.push(join(process.cwd(), 'sw', 'remotion', 'public'))  // cwd = 모노레포 루트에서 실행
  return candidates.find(existsSync) ?? candidates[0]
})()

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif',
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  // 세그먼트별 디코딩 — 한글 폴더(예: 09-디지털저항군)는 인코딩된 채 넘어올 수 있다. 이미 디코딩됐으면 그대로.
  const decode = (s: string): string => { try { return decodeURIComponent(s) } catch { return s } }
  const rel = normalize(path.map(decode).join('/'))
  if (rel.startsWith('..') || rel.includes('\0')) return new NextResponse('bad path', { status: 400 })
  try {
    const buf = await readFile(join(REMOTION_PUBLIC, rel))
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': MIME[extname(rel).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return new NextResponse('not found', { status: 404 })
  }
}
