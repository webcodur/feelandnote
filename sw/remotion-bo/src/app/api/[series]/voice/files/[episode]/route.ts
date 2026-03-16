import { NextResponse } from 'next/server'
import { scanLocalWavs } from '@/lib/server-utils'

export async function GET(_req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const { episode } = await params
  const wavs = await scanLocalWavs(episode)
  return NextResponse.json(wavs.map(w => ({
    name: w.relPath,
    sizeKB: +(w.size / 1024).toFixed(0),
    duration: +(w.size / (24000 * 2)).toFixed(2),
  })))
}
