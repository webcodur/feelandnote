import { NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getSeriesById } from '@/lib/series-registry'
import { toPascal } from '@/lib/server-utils'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')

export async function GET(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!getSeriesById(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const url = new URL(req.url)
  const episode = url.searchParams.get('episode')
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  const label = toPascal(episode)
  const metaPath = path.join(REMOTION_ROOT, 'out', label, 'youtube-meta.json')

  try {
    if (!existsSync(metaPath)) return NextResponse.json(null)
    const data = JSON.parse(await readFile(metaPath, 'utf-8'))
    return NextResponse.json(data)
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
  const label = toPascal(episode)
  const outDir = path.join(REMOTION_ROOT, 'out', label)
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'youtube-meta.json'), JSON.stringify(body, null, 2) + '\n', 'utf-8')
  return NextResponse.json({ ok: true })
}
