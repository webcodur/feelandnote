import { NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { loadEpisode, toPascal } from '@/lib/server-utils'
import { getSeriesById } from '@/lib/series-registry'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')

type VariantInfo = {
  lang: 'ko' | 'en'
  type: 'longform' | 'shorts' | 'solo'
  /** 옵션 2: 1-based 일관. longform은 무관(0 사용), shorts는 1, 2, 3 … */
  shortsIndex: number
  /** 1권 모드 책 인덱스 (0-based). solo 전용. */
  bookIndex?: number
  /** 매칭 키. e.g. 'ko-longform', 'ko-shorts-1', 'ko-solo-1' */
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

  // 에피소드 데이터 로드 (shorts 고정 slot·solos 추출)
  const koData = await loadEpisode(seriesId, episode).catch(() => null) as { shorts?: unknown; solos?: unknown } | null
  const enData = await loadEpisode(seriesId, `${episode}-en`).catch(() => null) as { shorts?: unknown; solos?: unknown } | null
  // 쇼츠 variant는 배열 길이(1..N)가 아니라 고정 slot으로 만든다 — 결번이 있으면 번호가 밀린다 (status-all과 동일 규칙)
  function shortsSlotsOf(data: { shorts?: unknown } | null): number[] {
    if (!data?.shorts) return []
    if (!Array.isArray(data.shorts)) return [1]
    return (data.shorts as Array<{ slot?: number }>)
      .map((s, i) => (typeof s?.slot === 'number' ? s.slot : i + 1))
      .sort((a, b) => a - b)
  }
  const koShortsSlots = shortsSlotsOf(koData)
  const enShortsSlots = shortsSlotsOf(enData)
  const koSolos: Array<{ featuredBookIndex?: number }> = Array.isArray(koData?.solos) ? koData!.solos as any : []
  const enSolos: Array<{ featuredBookIndex?: number }> = Array.isArray(enData?.solos) ? enData!.solos as any : []

  // 출력 파일 스캔 — shorts 배열 길이만큼 variant 확장
  const label = toPascal(episode)
  const outDir = path.join(REMOTION_ROOT, 'out', label)
  const variants: VariantInfo[] = []

  async function scanVariant(
    lang: 'ko' | 'en',
    type: 'longform' | 'shorts' | 'solo',
    shortsIndex: number,  // 1-based for shorts, 0 for longform/solo
    bookIndex?: number,   // 0-based for solo
  ) {
    const langCode = lang.toUpperCase()
    const langDir = path.join(outDir, langCode)

    // 파일 suffix — longform=LH(가로), shorts=S{N}, solo=B{NN}
    let baseSuffix: string
    if (type === 'longform') baseSuffix = 'LH'
    else if (type === 'solo') baseSuffix = `B${String((bookIndex ?? 0) + 1).padStart(2, '0')}`
    else baseSuffix = `S${shortsIndex}`

    const videoName = `${baseSuffix}-VID.mp4`
    const videoPath = path.join(langDir, videoName)

    const thumbName = `${baseSuffix}-THUMB.png`
    const thumbPath = path.join(langDir, thumbName)

    const srtName = `${baseSuffix}-VID.srt`
    const srtPath = path.join(langDir, srtName)

    // variant key — longform·shorts·solo 각각 1-based 일관
    let key: string
    if (type === 'longform') key = `${lang}-longform`
    else if (type === 'solo') key = `${lang}-solo-${(bookIndex ?? 0) + 1}`
    else key = `${lang}-shorts-${shortsIndex}`

    let videoInfo: VariantInfo['video'] = null
    if (existsSync(videoPath)) {
      const s = await stat(videoPath)
      videoInfo = { exists: true, size: s.size, name: videoName }
    }

    variants.push({
      lang, type, shortsIndex, bookIndex, key,
      video: videoInfo,
      srt: existsSync(srtPath) ? { exists: true, name: srtName } : null,
      thumb: existsSync(thumbPath) ? { exists: true, name: thumbName } : null,
    })
  }

  if (koData) await scanVariant('ko', 'longform', 0)
  for (const slot of koShortsSlots) await scanVariant('ko', 'shorts', slot)
  for (const s of koSolos) {
    if (typeof s.featuredBookIndex === 'number') await scanVariant('ko', 'solo', 0, s.featuredBookIndex)
  }
  if (enData) await scanVariant('en', 'longform', 0)
  for (const slot of enShortsSlots) await scanVariant('en', 'shorts', slot)
  for (const s of enSolos) {
    if (typeof s.featuredBookIndex === 'number') await scanVariant('en', 'solo', 0, s.featuredBookIndex)
  }

  // youtube-meta.json 읽기
  const metaPath = path.join(outDir, 'youtube-meta.json')
  let meta = null
  try {
    if (existsSync(metaPath)) meta = JSON.parse(await readFile(metaPath, 'utf-8'))
  } catch { /* ignore */ }

  return NextResponse.json({ auth, lineup: episodeMeta, variants, meta })
}
