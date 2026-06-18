import { NextResponse } from 'next/server'
import { isValidSeries, isFactionSeries } from '@/lib/series-registry'
import { listFactionImages, listFactionImageTree, saveFactionImage, deleteFactionImage } from '@/lib/faction-utils'

function guard(series: string) {
  return isValidSeries(series) && isFactionSeries(series)
}

/**
 * GET ?ep= : 에피소드 이미지 파일명 목록 (images/ 단일 배열, picker 호환)
 * GET ?ep=&tree=1 : 폴더 트리 스캔 결과 { files, folders } (이미지 풀용)
 */
export async function GET(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  const url = new URL(req.url)
  const ep = url.searchParams.get('ep')
  if (!ep) return NextResponse.json({ error: 'ep required' }, { status: 400 })
  if (url.searchParams.get('tree') === '1') {
    return NextResponse.json(await listFactionImageTree(ep))
  }
  return NextResponse.json(await listFactionImages(ep))
}

/** POST multipart(ep, file) : 이미지 업로드 → basename 반환 */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  const form = await req.formData()
  const ep = form.get('ep')
  const file = form.get('file')
  if (typeof ep !== 'string' || !(file instanceof File)) {
    return NextResponse.json({ error: 'ep and file required' }, { status: 400 })
  }
  const buf = Buffer.from(await file.arrayBuffer())
  const saved = await saveFactionImage(ep, file.name, buf)
  return NextResponse.json({ ok: true, file: saved })
}

/** DELETE ?ep=&file= : 이미지 삭제 */
export async function DELETE(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  const url = new URL(req.url)
  const ep = url.searchParams.get('ep')
  const file = url.searchParams.get('file')
  if (!ep || !file) return NextResponse.json({ error: 'ep and file required' }, { status: 400 })
  await deleteFactionImage(ep, file)
  return NextResponse.json({ ok: true })
}
