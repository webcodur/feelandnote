import { NextResponse } from 'next/server'
import { readFile, readdir, stat } from 'fs/promises'
import path from 'path'
import { scanLocalWavs, loadR2Manifest, fileHash, loadEpisode, VOICE_DIR } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

/** 셀럽 음성 파일 패턴 (ElevenLabs 대상) */
const CELEB_PATTERNS = ['philosophy', 'featured-quote', 'celeb-mid', 'celeb-end']

/** common/ 디렉토리의 WAV 파일 스캔 */
async function scanCommonWavs(): Promise<{ relPath: string; absPath: string; size: number }[]> {
  const dir = path.join(VOICE_DIR, 'common')
  const results: { relPath: string; absPath: string; size: number }[] = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith('.wav')) {
        const abs = path.join(dir, e.name)
        const s = await stat(abs)
        results.push({ relPath: `common/${e.name}`, absPath: abs, size: s.size })
      }
    }
  } catch { /* common/ 없으면 무시 */ }
  return results
}

/**
 * GET /api/{series}/voice/r2-files/{episode}
 * Returns per-file R2 sync status for a single episode + common files.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ series: string; episode: string }> }) {
  const { series, episode } = await params

  let hasEL = false
  try {
    if (isValidSeries(series)) {
      const ep = await loadEpisode(series, episode)
      hasEL = !!ep?.host?.elevenlabsVoiceId
    }
  } catch { /* 에피소드 로드 실패 시 무시 */ }

  const wavs = await scanLocalWavs(episode)
  const commonWavs = await scanCommonWavs()
  const allWavs = [...wavs, ...commonWavs]
  const r2m = await loadR2Manifest(episode)
  const r2Keys = new Set(Object.keys(r2m))

  const files = await Promise.all(allWavs.map(async (w) => {
    const buf = await readFile(w.absPath)
    const hash = fileHash(buf)
    const sizeKB = +(w.size / 1024).toFixed(0)
    const duration = +(w.size / (24000 * 2)).toFixed(2)
    let status: 'synced' | 'unsynced' | 'local-only' = 'local-only'
    if (r2m[w.relPath]) {
      status = r2m[w.relPath].hash === hash ? 'synced' : 'unsynced'
      r2Keys.delete(w.relPath)
    }
    // engine detection
    let engine: string
    if (w.relPath.startsWith('common/')) engine = 'common'
    else if (w.relPath.startsWith('gemini/')) engine = 'gemini'
    else if (w.relPath.startsWith('cloud/')) engine = 'cloud'
    else if (w.relPath.startsWith('elevenlabs/')) engine = 'elevenlabs'
    else if (hasEL && CELEB_PATTERNS.some(p => w.relPath.includes(p))) engine = 'elevenlabs'
    else engine = 'gemini'
    return { name: w.relPath, sizeKB, duration, status, engine }
  }))

  const total = files.length
  const totalSizeKB = files.reduce((s, f) => s + f.sizeKB, 0)
  const synced = files.filter(f => f.status === 'synced').length
  const unsynced = files.filter(f => f.status === 'unsynced').length
  const localOnly = files.filter(f => f.status === 'local-only').length

  return NextResponse.json({
    files,
    summary: { total, totalSizeKB, synced, unsynced, localOnly },
  })
}
