import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { isValidSeries, isFactionSeries } from '@/lib/series-registry'
import { FACTIONS_DIR, safeFilename } from '@/lib/faction-utils'

function guard(series: string) {
  return isValidSeries(series) && isFactionSeries(series)
}

/** POST { ep } : 에피소드 이미지 폴더(public/factions/{ep}/)를 탐색기로 연다. */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as { ep?: string }
  const ep = body.ep
  if (!ep) return NextResponse.json({ error: 'ep required' }, { status: 400 })

  // safeFilename 으로 경로 이탈(..) 차단 후 에피소드 루트 폴더 구성
  const target = path.join(FACTIONS_DIR, safeFilename(ep))
  if (!existsSync(target)) {
    return NextResponse.json({ error: 'folder not found', target }, { status: 404 })
  }

  spawn('explorer.exe', [target], { detached: true, stdio: 'ignore' })
  return NextResponse.json({ ok: true, opened: target })
}
