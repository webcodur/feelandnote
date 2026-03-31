import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getSeriesById } from '@/lib/series-registry'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
const LINEUP_PATH = path.join(REMOTION_ROOT, 'scripts', 'youtube', 'youtube-lineup.json')

export async function GET(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!getSeriesById(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const url = new URL(req.url)
  const episode = url.searchParams.get('episode')
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  try {
    if (!existsSync(LINEUP_PATH)) return NextResponse.json(null)
    const all = JSON.parse(await readFile(LINEUP_PATH, 'utf-8'))
    return NextResponse.json(all[episode] ?? null)
  } catch {
    return NextResponse.json(null)
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!getSeriesById(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const url = new URL(req.url)
  const episode = url.searchParams.get('episode')
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  const body = await req.json()
  const { hook, privacyStatus } = body
  if (!hook || !privacyStatus) {
    return NextResponse.json({ error: 'hook, privacyStatus required' }, { status: 400 })
  }

  let all: Record<string, unknown> = {}
  try {
    if (existsSync(LINEUP_PATH)) all = JSON.parse(await readFile(LINEUP_PATH, 'utf-8'))
  } catch { /* fresh start */ }

  all[episode] = { ...(all[episode] as Record<string, unknown>), hook, privacyStatus }
  await writeFile(LINEUP_PATH, JSON.stringify(all, null, 2) + '\n', 'utf-8')
  return NextResponse.json({ ok: true })
}
