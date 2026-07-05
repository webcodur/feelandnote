/**
 * 카드뉴스 편성 저장/로드 — 영상 데이터와 분리된 별도 파일(public/episodes/<인물>/faction-cards.json).
 * 편성(선별 권·순서, 추후 텍스트 보정)만 담는다. ko/en 공용(편성은 언어 무관).
 */
import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { findEpisodeDir, parseEpisodeId, EPISODES_DIR } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

function cardsPath(name: string): string {
  const { person } = parseEpisodeId(name)
  const found = findEpisodeDir(person)
  const base = found ? found.dir : path.join(EPISODES_DIR, 'todo', person)
  return path.join(base, 'faction-cards.json')
}

export async function GET(_req: Request, { params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  try {
    const buf = await readFile(cardsPath(name), 'utf8')
    return NextResponse.json(JSON.parse(buf))
  } catch {
    return NextResponse.json({}) // 편성 파일이 아직 없으면 빈 편성
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  try {
    const body = await req.json()
    await writeFile(cardsPath(name), JSON.stringify(body, null, 2), 'utf8')
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
