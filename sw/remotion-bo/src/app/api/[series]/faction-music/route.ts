import { NextResponse } from 'next/server'
import { isValidSeries, isFactionSeries } from '@/lib/series-registry'
import { listMusic, saveMusic } from '@/lib/faction-utils'

function guard(series: string) {
  return isValidSeries(series) && isFactionSeries(series)
}

/** GET : public/music/ 의 음악 파일 목록 */
export async function GET(_req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  return NextResponse.json(await listMusic())
}

/** POST multipart(file) : 음악 업로드 → basename 반환 */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })
  const buf = Buffer.from(await file.arrayBuffer())
  const saved = await saveMusic(file.name, buf)
  return NextResponse.json({ ok: true, file: saved })
}
