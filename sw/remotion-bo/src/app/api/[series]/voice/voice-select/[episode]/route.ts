import { NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { VOICE_DIR } from '@/lib/server-utils'

function filePath(episode: string) {
  return path.join(VOICE_DIR, episode, 'voice-select.json')
}

/** GET — 현재 voice-select.json 반환 */
export async function GET(_req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const { episode } = await params
  try {
    const raw = await readFile(filePath(episode), 'utf-8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json(null)
  }
}

/** PUT — voice-select.json 저장 */
export async function PUT(req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const { episode } = await params
  const body = await req.json()
  const fp = filePath(episode)
  await mkdir(path.dirname(fp), { recursive: true })
  await writeFile(fp, JSON.stringify(body, null, 2) + '\n', 'utf-8')
  return NextResponse.json({ success: true })
}
