import { NextResponse } from 'next/server'
import { saveImage, safeFilename } from '@feelandnote/shared/bo/episode-store'
import { FACTIONS_DIR } from '@/lib/faction-paths'
import { guardFactionRoute } from '@/lib/faction-route'

/**
 * POST { ep, url, slug } : 셀럽 아바타(외부 URL)를 내려받아 에피소드 이미지로 저장.
 * 시리즈 전용 이미지 큐레이션 — DB 아바타를 로컬 파일로 흡수한다.
 *
 * 주소의 `faction-avatar` 는 공용 사진 부품이 부르는 이름이라 그대로 둔다(`/api/{시리즈}/faction-avatar`).
 */
export async function POST(req: Request) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { ep, url, slug } = await req.json()
  if (!ep || !url) return NextResponse.json({ error: 'ep and url required' }, { status: 400 })

  let res: Response
  try {
    res = await fetch(url)
  } catch (e: unknown) {
    return NextResponse.json({ error: `fetch failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 })
  }
  if (!res.ok) return NextResponse.json({ error: `source returned ${res.status}` }, { status: 502 })

  const buf = Buffer.from(await res.arrayBuffer())
  const extMatch = url.split('?')[0].match(/\.(png|jpe?g|webp)$/i)
  const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg'
  const base = safeFilename(slug || 'celeb')
  // 교체: 껍데기 함수(saveFactionImage) 대신 공용 부품에 뿌리 폴더를 직접 넘긴다
  const saved = await saveImage(FACTIONS_DIR, ep, `${base}${ext}`, buf)
  return NextResponse.json({ ok: true, file: saved })
}
