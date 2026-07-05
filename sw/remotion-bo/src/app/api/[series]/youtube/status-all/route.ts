import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync, statSync } from 'fs'
import path from 'path'
import { listEpisodes, loadEpisode, toPascal } from '@/lib/server-utils'
import { getSeriesById } from '@/lib/series-registry'

// 실행 시점에만 도는 동적 라우트(렌더 산출물 out/ 을 fs로 스캔). 빌드 타임 정적 분석·prerender 대상이 아님.
// 경로 상수를 모듈 최상위에 두면 Turbopack이 out/ 디렉토리를 번들 자산으로 추적하다 깨진다 → 핸들러 내부에서 런타임 계산.
export const dynamic = 'force-dynamic'

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

  const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
  const LINEUP_PATH = path.join(REMOTION_ROOT, 'scripts', 'youtube', 'youtube-lineup.json')

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
    let koSlots: number[] = []
    let enSlots: number[] = []
    let hasKo = false
    let hasEn = false
    let bookCount = 0
    let partInfo: { part: number; totalParts: number; totalBooks: number } | null = null
    try {
      const ep = await loadEpisode(series, name)
      nickname = ep.host?.nickname ?? name
      hasKo = true
      koSlots = Array.isArray(ep.shorts) ? ep.shorts.map((s: { slot?: number }) => s?.slot).filter((n: unknown): n is number => typeof n === 'number') : (ep.shorts ? [1] : [])
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
      enSlots = Array.isArray(epEn.shorts) ? epEn.shorts.map((s: { slot?: number }) => s?.slot).filter((n: unknown): n is number => typeof n === 'number') : (epEn.shorts ? [1] : [])
    } catch { /* ignore */ }

    // lineup 메타
    const lineup = lineupAll[name] ?? null

    // 렌더 파일 스캔 — shorts 배열 길이만큼 동적 확장
    const label = toPascal(name)
    const outDir = path.join(REMOTION_ROOT, 'out', label)
    const variants: VariantStatus[] = []

    function pushVariant(lang: 'ko' | 'en', type: 'longform' | 'shorts', shortsIndex: number) {
      // 옵션 2: 1-based 일관. longform=LH(가로), shorts=S{N}
      const langCode = lang.toUpperCase()
      const langDir = path.join(outDir, langCode)
      const baseSuffix = type === 'longform' ? 'LH' : `S${shortsIndex}`
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
    for (const slot of koSlots) pushVariant('ko', 'shorts', slot)
    if (hasEn) pushVariant('en', 'longform', 0)
    for (const slot of enSlots) pushVariant('en', 'shorts', slot)

    return { name, nickname, lineup, variants, bookCount, partInfo }
  }))

  return NextResponse.json({ episodes })
}
