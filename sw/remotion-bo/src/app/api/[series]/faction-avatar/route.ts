import { NextResponse } from 'next/server'
import { isSeriesModel } from '@/lib/series-registry'
import { saveFactionImage, safeFilename } from '@/lib/faction-utils'

/**
 * POST { ep, url, slug } : 셀럽 아바타(외부 URL)를 내려받아 에피소드 이미지로 저장.
 * 시리즈 전용 이미지 큐레이션 — DB 아바타를 로컬 파일로 흡수한다.
 */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isSeriesModel(series, 'faction')) {
    return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  }
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
  const saved = await saveFactionImage(ep, `${base}${ext}`, buf)
  return NextResponse.json({ ok: true, file: saved })
}
