import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { isSeriesModel } from '@/lib/series-registry'
import { FACTIONS_DIR, safeDirName } from '@/lib/faction-utils'

function guard(series: string) {
  return isSeriesModel(series, 'faction')
}

/**
 * POST { ep, folder? } : 에피소드 이미지 폴더(public/factions/{ep}/)를 탐색기로 연다.
 * folder 를 주면 그 하위 폴더(예 '1', 'images')를 직접 연다.
 */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as { ep?: string; folder?: string }
  const ep = body.ep
  if (!ep) return NextResponse.json({ error: 'ep required' }, { status: 400 })

  // safeDirName 으로 경로 이탈(..) 차단 후 에피소드 루트 폴더 구성
  let target = path.join(FACTIONS_DIR, safeDirName(ep))
  // 하위 폴더 — 경로 이탈(.. / .)만 거르고 한글·공백 세그먼트는 그대로 둔다(이미지 서빙과 동일 규칙)
  if (body.folder) {
    const segs = body.folder.split('/').filter(s => s && s !== '.' && s !== '..')
    if (segs.length) target = path.join(target, ...segs)
  }
  if (!existsSync(target)) {
    return NextResponse.json({ error: 'folder not found', target }, { status: 404 })
  }

  spawn('explorer.exe', [target], { detached: true, stdio: 'ignore' })
  return NextResponse.json({ ok: true, opened: target })
}
