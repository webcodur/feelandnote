import { NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { voiceDir } from '@/features/book-recommend/lib/server-utils'
import { isValidSeries } from '@/features/book-recommend/lib/series-registry'

function filePath(episode: string) {
  return path.join(voiceDir(episode), 'voice-select.json')
}

/** GET — 현재 voice-select.json 반환 */
export async function GET(_req: Request, { params }: { params: Promise<{ series: string; episode: string }> }) {
  const { series, episode } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  try {
    const raw = await readFile(filePath(episode), 'utf-8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json(null)
  }
}

/** PUT — voice-select.json 저장 */
export async function PUT(req: Request, { params }: { params: Promise<{ series: string; episode: string }> }) {
  const { series, episode } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  const body = await req.json()
  const fp = filePath(episode)
  await mkdir(path.dirname(fp), { recursive: true })
  await writeFile(fp, JSON.stringify(body, null, 2) + '\n', 'utf-8')
  return NextResponse.json({ success: true })
}
