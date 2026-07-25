/**
 * 렌더 저장소(sw/remotion)의 public 자산(책 표지·인물 사진 등)을 관리 화면에서 띄우기 위한 통로.
 * 카드뉴스 미리보기·카드 출고가 assetBase='/api/rm-asset' 로 참조한다.
 * 예: /api/rm-asset/factions/09-디지털저항군/images/person.jpg
 *
 * ⚠ 이 앱의 진입 검사(`src/proxy.ts`)는 **경로가 이미지 확장자로 끝나면 아예 건너뛴다.**
 *   그래서 아래 진입 검사가 이 창구의 유일한 방어다 — 순서를 바꾸거나 빼지 마라.
 *
 * 다만 **카드 출고 때는 사람이 부르는 게 아니다.** 헤드리스 브라우저가 다른 프로세스에서
 * 사진을 가져가는데 그쪽엔 로그인 정보가 없다. 그래서 출고를 시작할 때 만든 한 번짜리 열쇠도
 * 통과시킨다(faction-render-token). 열쇠는 주소의 앞 두 토막(`_k/<열쇠>`)으로 오고, 서버 메모리에만
 * 있으며 정해진 시간이 지나면 사라진다. 물음표 뒤(query)가 아니라 경로인 이유는 렌더 쪽이
 * 자산 주소를 `기준주소/상대경로` 로 이어 붙이기 때문이다(물음표를 쓰면 뒤 경로가 질의에 묻힌다).
 */
import { readFile } from 'fs/promises'
import { join, extname, normalize } from 'path'
import { NextResponse, type NextRequest } from 'next/server'
import { REMOTION_ROOT } from '@feelandnote/shared/bo/remotion-root'
import { guardFactionRoute } from '@/lib/faction-route'
import { isRenderKeyValid, RENDER_KEY_SEGMENT } from '@/lib/faction-render-token'
import { factionLocalGuard } from '@/lib/faction-local'

// 교체: 원본은 패키지 해석(createRequire)으로 remotion 위치를 찾다 Turbopack 이 경로를 가려 후보를 여러 개 뒤졌다.
//   이제 공용 부품이 렌더 저장소 뿌리를 한 곳에서 정한다(REMOTION_ROOT 환경변수로 옮길 수 있다).
const REMOTION_PUBLIC = join(REMOTION_ROOT, 'public')

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif',
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: rawPath } = await params

  // 렌더 과정이 부른 것인지 먼저 본다 — 그 경우에도 로컬 자산 창구가 켜져 있어야 한다
  const viaRenderKey = rawPath[0] === RENDER_KEY_SEGMENT && isRenderKeyValid(rawPath[1])
  if (viaRenderKey) {
    const off = factionLocalGuard()
    if (off) return off
  } else {
    const denied = await guardFactionRoute()
    if (denied) return denied
  }
  // 열쇠 토막은 자산 경로가 아니므로 떼어낸다
  const path = viaRenderKey ? rawPath.slice(2) : rawPath
  if (!path.length) return new NextResponse('bad path', { status: 400 })
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
