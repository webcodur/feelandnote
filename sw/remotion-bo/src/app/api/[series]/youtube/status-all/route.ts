import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync, statSync } from 'fs'
import path from 'path'
import { listEpisodes, loadEpisode, toPascal } from '@/lib/server-utils'
import { getSeriesById } from '@/lib/series-registry'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
const LINEUP_PATH = path.join(REMOTION_ROOT, 'scripts', 'youtube', 'youtube-lineup.json')

type VariantStatus = {
  lang: 'ko' | 'en'
  type: 'longform' | 'shorts'
  hasVideo: boolean
  videoSize: number
  hasSrt: boolean
  hasThumb: boolean
}

export async function GET(_req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!getSeriesById(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  // lineup.json 전체 로드
  let lineupAll: Record<string, unknown> = {}
  try {
    if (existsSync(LINEUP_PATH)) lineupAll = JSON.parse(await readFile(LINEUP_PATH, 'utf-8'))
  } catch { /* ignore */ }

  // 에피소드 목록 (KO만 — EN은 별도 에피소드가 아닌 variant)
  const allItems = await listEpisodes(series)
  const koNames = allItems.map(i => i.id).filter(n => !n.endsWith('-en'))

  const episodes = await Promise.all(koNames.map(async (name) => {
    // 닉네임 로드
    let nickname = name
    try {
      const ep = await loadEpisode(series, name)
      nickname = ep.host?.nickname ?? name
    } catch { /* ignore */ }

    // lineup 메타
    const lineup = lineupAll[name] ?? null

    // 렌더 파일 스캔
    const label = toPascal(name)
    const outDir = path.join(REMOTION_ROOT, 'out', label)
    const variants: VariantStatus[] = []

    for (const lang of ['ko', 'en'] as const) {
      for (const type of ['longform', 'shorts'] as const) {
        const langCode = lang.toUpperCase()
        const typeCode = type === 'longform' ? 'L' : 'S'
        const langDir = path.join(outDir, langCode)

        const videoPath = path.join(langDir, `${typeCode}-VID.mp4`)
        const srtPath = path.join(langDir, `${typeCode}-VID.srt`)
        const thumbPath = path.join(langDir, `${typeCode}-THUMB.png`)

        const hasVideo = existsSync(videoPath)
        variants.push({
          lang, type,
          hasVideo,
          videoSize: hasVideo ? statSync(videoPath).size : 0,
          hasSrt: existsSync(srtPath),
          hasThumb: existsSync(thumbPath),
        })
      }
    }

    return { name, nickname, lineup, variants }
  }))

  return NextResponse.json({ episodes })
}
