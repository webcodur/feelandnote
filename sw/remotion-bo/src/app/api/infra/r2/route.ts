import { NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import { VOICE_DIR, scanLocalWavs, loadR2Manifest } from '@/lib/server-utils'

const KNOWN_ENGINES = ['gemini', 'cloud', 'elevenlabs']

export async function GET() {
  const entries = await readdir(VOICE_DIR, { withFileTypes: true })
  const dirs = entries.filter(e => e.isDirectory()).map(e => e.name)

  const episodes = await Promise.all(
    dirs.map(async (name) => {
      const wavs = await scanLocalWavs(name)
      const r2m = await loadR2Manifest(name)
      const sizeMB = +(wavs.reduce((s, w) => s + w.size, 0) / 1024 / 1024).toFixed(1)

      // Detect engine subdirectories
      const engines: string[] = []
      for (const w of wavs) {
        const seg = w.relPath.split('/')[0]
        if (KNOWN_ENGINES.includes(seg) && !engines.includes(seg)) {
          engines.push(seg)
        }
      }

      // Count r2-synced: local files whose relPath exists in manifest
      const r2Keys = new Set(Object.keys(r2m))
      const r2Synced = wavs.filter(w => r2Keys.has(w.relPath)).length

      return {
        name,
        files: wavs.length,
        sizeMB,
        r2Synced,
        r2Total: r2Keys.size,
        engines,
      }
    })
  )

  episodes.sort((a, b) => b.sizeMB - a.sizeMB)

  const totalFiles = episodes.reduce((s, e) => s + e.files, 0)
  const totalSizeMB = +episodes.reduce((s, e) => s + e.sizeMB, 0).toFixed(1)

  return NextResponse.json({ totalFiles, totalSizeMB, episodes })
}
