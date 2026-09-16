/**
 * 렌더 저장소(sw/remotion)의 public 자산(책 표지·인물 사진 등)을 관리 화면에서 띄우기 위한 통로.
 * 카드뉴스 미리보기가 assetBase='/api/rm-asset' 로 참조한다.
 *
 * ⚠ 이 앱의 진입 검사(`src/proxy.ts`)는 **경로가 이미지 확장자로 끝나면 아예 건너뛴다.**
 *   그래서 아래 진입 검사가 이 창구의 유일한 방어다 — 순서를 바꾸거나 빼지 마라.
 */
import { readFile } from 'fs/promises'
import { join, extname, normalize } from 'path'
import { NextResponse, type NextRequest } from 'next/server'
import { REMOTION_ROOT } from '@feelandnote/shared/bo/remotion-root'
import { guardRemotionRoute } from '@/lib/remotion-route'

// 교체: 원본은 패키지 해석(createRequire)으로 remotion 위치를 찾다 Turbopack 이 경로를 가려 후보를 여러 개 뒤졌다.
//   이제 공용 부품이 렌더 저장소 뿌리를 한 곳에서 정한다(REMOTION_ROOT 환경변수로 옮길 수 있다).
const REMOTION_PUBLIC = join(REMOTION_ROOT, 'public')

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif',
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const denied = await guardRemotionRoute()
  if (denied) return denied

  const { path } = await params
  if (!path.length) return new NextResponse('bad path', { status: 400 })
  // 세그먼트별 디코딩 — 한글 폴더는 인코딩된 채 넘어올 수 있다. 이미 디코딩됐으면 그대로.
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
