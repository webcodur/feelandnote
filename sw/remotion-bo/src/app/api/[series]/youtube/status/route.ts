import { NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { loadEpisode, toPascal } from '@/lib/server-utils'
import { getSeriesById } from '@/lib/series-registry'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')

type VariantInfo = {
  lang: 'ko' | 'en'
  type: 'longform' | 'shorts'
  /** 옵션 2: 1-based 일관. longform은 무관(0 사용), shorts는 1, 2, 3 … */
  shortsIndex: number
  /** 매칭 키. e.g. 'ko-longform', 'ko-shorts-1', 'ko-shorts-2' */
  key: string
  video: { exists: boolean; size: number; name: string } | null
  srt: { exists: boolean; name: string } | null
  thumb: { exists: boolean; name: string } | null
}

export async function GET(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series: seriesId } = await params
  const series = getSeriesById(seriesId)
  if (!series) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const url = new URL(req.url)
  const episode = url.searchParams.get('episode')
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  // 인증 확인 (KO/EN 채널 각각)
  function checkToken(fileName: string) {
    const tp = path.join(REMOTION_ROOT, 'credentials', fileName)
    try {
      if (existsSync(tp)) {
        const token = JSON.parse(readFileSync(tp, 'utf-8'))
        return { authenticated: true, expiryDate: token.expiry_date ? new Date(token.expiry_date).toISOString() : undefined }
      }
    } catch { /* ignore */ }
    return { authenticated: false, expiryDate: undefined as string | undefined }
  }
  const auth = { ko: checkToken('youtube_token.json'), en: checkToken('youtube_token_en.json') }

  // lineup 읽기
  const lineupPath = path.join(REMOTION_ROOT, 'scripts', 'youtube', 'youtube-lineup.json')
  let lineup: Record<string, unknown> | null = null
  let episodeMeta = null
  try {
    lineup = JSON.parse(await readFile(lineupPath, 'utf-8'))
    episodeMeta = (lineup as any)[episode] ?? null
  } catch { /* ignore */ }

  // 에피소드 데이터 로드 (shorts 배열 길이 추출)
  const koData = await loadEpisode(seriesId, episode).catch(() => null) as { shorts?: unknown } | null
  const enData = await loadEpisode(seriesId, `${episode}-en`).catch(() => null) as { shorts?: unknown } | null
  const koShortsCount = Array.isArray(koData?.shorts) ? koData!.shorts!.length as number : (koData?.shorts ? 1 : 0)
  const enShortsCount = Array.isArray(enData?.shorts) ? enData!.shorts!.length as number : (enData?.shorts ? 1 : 0)

  // 출력 파일 스캔 — shorts 배열 길이만큼 variant 확장
  const label = toPascal(episode)
  const outDir = path.join(REMOTION_ROOT, 'out', label)
  const variants: VariantInfo[] = []

  async function scanVariant(
    lang: 'ko' | 'en',
    type: 'longform' | 'shorts',
    shortsIndex: number,  // 1-based for shorts, 0 for longform
  ) {
    const langCode = lang.toUpperCase()
    const langDir = path.join(outDir, langCode)

    // 옵션 2: file suffix 1-based 일관. longform=L, shorts=S{N}
    const baseSuffix = type === 'longform' ? 'L' : `S${shortsIndex}`

    const videoName = `${baseSuffix}-VID.mp4`
    const videoPath = path.join(langDir, videoName)

    const thumbName = `${baseSuffix}-THUMB.png`
    const thumbPath = path.join(langDir, thumbName)

    const srtName = `${baseSuffix}-VID.srt`
    const srtPath = path.join(langDir, srtName)

    // 옵션 2: variant key 1-based 일관
    const key = type === 'longform' ? `${lang}-longform` : `${lang}-shorts-${shortsIndex}`

    let videoInfo: VariantInfo['video'] = null
    if (existsSync(videoPath)) {
      const s = await stat(videoPath)
      videoInfo = { exists: true, size: s.size, name: videoName }
    }

    variants.push({
      lang, type, shortsIndex, key,
      video: videoInfo,
      srt: existsSync(srtPath) ? { exists: true, name: srtName } : null,
      thumb: existsSync(thumbPath) ? { exists: true, name: thumbName } : null,
    })
  }

  if (koData) await scanVariant('ko', 'longform', 0)
  for (let i = 1; i <= koShortsCount; i++) await scanVariant('ko', 'shorts', i)
  if (enData) await scanVariant('en', 'longform', 0)
  for (let i = 1; i <= enShortsCount; i++) await scanVariant('en', 'shorts', i)

  // youtube-meta.json 읽기
  const metaPath = path.join(outDir, 'youtube-meta.json')
  let meta = null
  try {
    if (existsSync(metaPath)) meta = JSON.parse(await readFile(metaPath, 'utf-8'))
  } catch { /* ignore */ }

  return NextResponse.json({ auth, lineup: episodeMeta, variants, meta })
}
