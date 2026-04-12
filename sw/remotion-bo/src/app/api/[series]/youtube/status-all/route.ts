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
  shortsIndex: number
  key: string
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
    // 닉네임 + shorts 카운트 + 책수 + 시리즈 정보 로드
    let nickname = name
    let koShortsCount = 0
    let enShortsCount = 0
    let hasKo = false
    let hasEn = false
    let bookCount = 0
    let partInfo: { part: number; totalParts: number; totalBooks: number } | null = null
    try {
      const ep = await loadEpisode(series, name)
      nickname = ep.host?.nickname ?? name
      hasKo = true
      koShortsCount = Array.isArray(ep.shorts) ? ep.shorts.length : (ep.shorts ? 1 : 0)
      bookCount = Array.isArray(ep.books) ? ep.books.length : 0
      if (ep.series && typeof ep.series.totalParts === 'number' && ep.series.totalParts > 1) {
        partInfo = {
          part: ep.series.part,
          totalParts: ep.series.totalParts,
          totalBooks: ep.series.totalBooks ?? bookCount,
        }
      }
    } catch { /* ignore */ }
    try {
      const epEn = await loadEpisode(series, `${name}-en`)
      hasEn = true
      enShortsCount = Array.isArray(epEn.shorts) ? epEn.shorts.length : (epEn.shorts ? 1 : 0)
    } catch { /* ignore */ }

    // lineup 메타
    const lineup = lineupAll[name] ?? null

    // 렌더 파일 스캔 — shorts 배열 길이만큼 동적 확장
    const label = toPascal(name)
    const outDir = path.join(REMOTION_ROOT, 'out', label)
    const variants: VariantStatus[] = []

    function pushVariant(lang: 'ko' | 'en', type: 'longform' | 'shorts', shortsIndex: number) {
      // 옵션 2: 1-based 일관. longform=L, shorts=S{N}
      const langCode = lang.toUpperCase()
      const langDir = path.join(outDir, langCode)
      const baseSuffix = type === 'longform' ? 'L' : `S${shortsIndex}`
      const key = type === 'longform' ? `${lang}-longform` : `${lang}-shorts-${shortsIndex}`

      const videoPath = path.join(langDir, `${baseSuffix}-VID.mp4`)
      const srtPath = path.join(langDir, `${baseSuffix}-VID.srt`)
      const thumbPath = path.join(langDir, `${baseSuffix}-THUMB.png`)
      const hasVideo = existsSync(videoPath)

      variants.push({
        lang, type, shortsIndex, key,
        hasVideo,
        videoSize: hasVideo ? statSync(videoPath).size : 0,
        hasSrt: existsSync(srtPath),
        hasThumb: existsSync(thumbPath),
      })
    }

    if (hasKo) pushVariant('ko', 'longform', 0)
    for (let i = 1; i <= koShortsCount; i++) pushVariant('ko', 'shorts', i)
    if (hasEn) pushVariant('en', 'longform', 0)
    for (let i = 1; i <= enShortsCount; i++) pushVariant('en', 'shorts', i)

    return { name, nickname, lineup, variants, bookCount, partInfo }
  }))

  return NextResponse.json({ episodes })
}
