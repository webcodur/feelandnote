import { NextResponse } from 'next/server'
import { isValidSeries, isFactionSeries } from '@/lib/series-registry'
import { listSfx } from '@/lib/faction-utils'

function guard(series: string) {
  return isValidSeries(series) && isFactionSeries(series)
}

/** GET : public/common/sfx/ 의 효과음 파일 목록 */
export async function GET(_req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  return NextResponse.json(await listSfx())
}
