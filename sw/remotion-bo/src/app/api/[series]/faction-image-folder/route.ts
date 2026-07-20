import { NextResponse } from 'next/server'
import { isSeriesModel } from '@/lib/series-registry'
import {
  createFactionFolder, renameFactionFolder, deleteFactionFolder, moveFactionImage,
} from '@/lib/faction-utils'

function guard(series: string) {
  return isSeriesModel(series, 'faction')
}

/**
 * POST { ep, action, ... } : 이미지 폴더 정리.
 * - action='create' { folder }            새 폴더 생성
 * - action='rename' { folder, name }       폴더 이름변경 → { from, to }
 * - action='delete' { folder }             빈 폴더 삭제
 * - action='move'   { from, toFolder }     파일 이동 → { from, to }
 */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!guard(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as {
    ep?: string; action?: string; folder?: string; name?: string; from?: string; toFolder?: string
  }
  const { ep, action } = body
  if (!ep || !action) return NextResponse.json({ error: 'ep and action required' }, { status: 400 })

  try {
    if (action === 'create') {
      const folder = await createFactionFolder(ep, body.folder ?? '')
      return NextResponse.json({ ok: true, folder })
    }
    if (action === 'rename') {
      const r = await renameFactionFolder(ep, body.folder ?? '', body.name ?? '')
      return NextResponse.json({ ok: true, ...r })
    }
    if (action === 'delete') {
      await deleteFactionFolder(ep, body.folder ?? '')
      return NextResponse.json({ ok: true })
    }
    if (action === 'move') {
      const r = await moveFactionImage(ep, body.from ?? '', body.toFolder ?? '')
      return NextResponse.json({ ok: true, ...r })
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
