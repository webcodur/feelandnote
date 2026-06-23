import { NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { loadEpisode, toPascal } from '@/lib/server-utils'
import { getSeriesById, isFactionSeries } from '@/lib/series-registry'
import { loadFactionEpisode } from '@/lib/faction-utils'
import { factionVariants } from '@feelandnote/shared/lib/youtube-faction-meta'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')

/**
 * 인증 토큰 확인 — KO/EN 채널 각각.
 *
 * expiryDate 는 1시간짜리 단기 접속 토큰(access token)의 만료 시각이라 거의 항상 지나 있다(잡음).
 * 실제로 "지금 업로드 가능한가"는 자동 재발급 열쇠(refresh_token) 유무가 결정한다 —
 * 이게 있으면 googleapis 가 만료된 접속 토큰을 알아서 갱신한다(youtube-core.ts 의 'tokens' 핸들러).
 * 그래서 hasRefreshToken 을 함께 내려 화면이 만료시각 대신 이 값을 보여주게 한다.
 */
function checkToken(fileName: string) {
  const tp = path.join(REMOTION_ROOT, 'credentials', fileName)
  try {
    if (existsSync(tp)) {
      const token = JSON.parse(readFileSync(tp, 'utf-8'))
      return {
        authenticated: true,
        expiryDate: token.expiry_date ? new Date(token.expiry_date).toISOString() : undefined,
        hasRefreshToken: !!token.refresh_token,
      }
    }
  } catch { /* ignore */ }
  return { authenticated: false, expiryDate: undefined as string | undefined, hasRefreshToken: false }
}

/**
 * 세력도 업로드 상태 — 한국어 세로 영상. 세로 롱폼(KO-LV) + 세로 쇼츠 N편(에피소드 데이터의 진영 part 수만큼).
 * 출력: out/Faction/{ep}-KO-LV.mp4 (롱폼) · {ep}-KO-S{N}.mp4 (쇼츠)
 * 기록: scripts/youtube/faction-lineup.json
 */
async function factionStatus(episode: string) {
  const auth = { ko: checkToken('youtube_token.json'), en: checkToken('youtube_token_en.json') }

  const lineupPath = path.join(REMOTION_ROOT, 'scripts', 'youtube', 'faction-lineup.json')
  let episodeMeta = null
  try {
    const lineup = JSON.parse(await readFile(lineupPath, 'utf-8'))
    episodeMeta = lineup[episode] ?? null
  } catch { /* ignore */ }

  // 영상 종류 — 에피소드 데이터의 진영 part 에서 편 수를 산출한다(편 없으면 단일 쇼츠).
  const factionData = await loadFactionEpisode(episode).catch(() => null)
  const epVariants = factionData ? factionVariants(factionData.groups) : []

  const factionOut = path.join(REMOTION_ROOT, 'out', 'Faction')

  const variants = []
  for (const v of epVariants) {
    const base = `${episode}-${v.fileSuffix}`
    const videoPath = path.join(factionOut, `${base}.mp4`)
    const srtPath = path.join(factionOut, `${base}.srt`)
    const thumbPath = path.join(factionOut, `${base}-THUMB.png`)
    let video = null
    if (existsSync(videoPath)) {
      const s = await stat(videoPath)
      video = { exists: true, size: s.size, name: `${base}.mp4` }
    }
    variants.push({
      lang: 'ko' as const,
      type: (v.isShorts ? 'shorts' : 'longform') as 'shorts' | 'longform',
      shortsIndex: v.part ?? 0,
      key: v.key,
      label: v.label,
      video,
      srt: existsSync(srtPath) ? { exists: true, name: `${base}.srt` } : null,
      thumb: existsSync(thumbPath) ? { exists: true, name: `${base}-THUMB.png` } : null,
    })
  }

  return NextResponse.json({ auth, lineup: episodeMeta, variants, meta: null })
}

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

  // 세력도 — 출력 경로·기록 파일이 달라 별도 분기
  if (isFactionSeries(seriesId)) return factionStatus(episode)

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
