import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { listEpisodes, scanLocalWavs, loadR2Manifest, fileHash } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

export async function GET(_req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const names = await listEpisodes(series)
  const result = await Promise.all(names.map(async (ep) => {
    const wavs = await scanLocalWavs(ep)
    const r2m = await loadR2Manifest(ep)
    let unsynced = 0
    for (const w of wavs) {
      const buf = await readFile(w.absPath)
      if (r2m[w.relPath]?.hash !== fileHash(buf)) unsynced++
    }
    return { episode: ep, local: wavs.length, r2: Object.keys(r2m).length, unsynced }
  }))
  return NextResponse.json(result)
}
