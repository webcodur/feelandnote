import { NextResponse } from 'next/server'
import { unlink, stat } from 'fs/promises'
import path from 'path'
import { voiceDir } from '@/features/book-recommend/lib/server-utils'
import { isValidSeries } from '@/features/book-recommend/lib/series-registry'

/**
 * DELETE — 특정 secKey의 WAV 파일을 지정 엔진에서 제거.
 * body: { secKey: string; engines: string[] }
 *   - engines 예: ['gemini', 'elevenlabs']
 *   - common 엔진은 거부(과거 자산 보호)
 * 응답: { deleted: string[]; errors: string[] }
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ series: string; episode: string }> }) {
  const { series, episode } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  let body: { secKey?: string; engines?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const secKey = body.secKey?.trim()
  const engines = Array.isArray(body.engines) ? body.engines.filter(Boolean) : []
  if (!secKey || engines.length === 0) {
    return NextResponse.json({ error: 'secKey와 engines가 필요합니다' }, { status: 400 })
  }
  // path traversal 방지
  if (secKey.includes('..') || path.isAbsolute(secKey)) {
    return NextResponse.json({ error: '잘못된 secKey' }, { status: 400 })
  }

  const base = voiceDir(episode)
  const deleted: string[] = []
  const errors: string[] = []

  for (const engine of engines) {
    if (engine !== 'gemini' && engine !== 'elevenlabs') {
      errors.push(`${engine}: 허용되지 않은 엔진`)
      continue
    }
    const rel = `${engine}/${secKey}.wav`
    const abs = path.join(base, rel)
    try {
      await stat(abs)
    } catch {
      // 파일이 없으면 조용히 건너뜀(이미 지워진 상태)
      continue
    }
    try {
      await unlink(abs)
      deleted.push(rel)
    } catch (e) {
      errors.push(`${rel}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return NextResponse.json({ deleted, errors })
}
