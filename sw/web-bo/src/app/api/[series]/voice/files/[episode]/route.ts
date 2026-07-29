import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { scanLocalWavs, getAudioDuration } from '@/features/book-recommend/lib/server-utils'
import { isValidSeries } from '@/features/book-recommend/lib/series-registry'

function detectEngine(relPath: string): string {
  if (relPath.startsWith('gemini/')) return 'gemini'
  if (relPath.startsWith('elevenlabs/')) return 'elevenlabs'
  return 'common'
}

export async function GET(_req: Request, { params }: { params: Promise<{ series: string; episode: string }> }) {
  const { series, episode } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  const wavs = await scanLocalWavs(episode)
  const files = await Promise.all(wavs.map(async (w) => {
    const buf = await readFile(w.absPath)
    return {
      name: w.relPath,
      sizeKB: +(w.size / 1024).toFixed(0),
      duration: getAudioDuration(buf, w.size),
      engine: detectEngine(w.relPath),
    }
  }))
  const totalSizeKB = files.reduce((s, f) => s + f.sizeKB, 0)
  return NextResponse.json(
    { files, summary: { total: files.length, totalSizeKB } },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
  )
}
