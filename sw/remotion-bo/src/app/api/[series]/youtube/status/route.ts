import { NextResponse } from 'next/server'
import { readFile, readdir, stat } from 'fs/promises'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { toPascal } from '@/lib/server-utils'
import { getSeriesById } from '@/lib/series-registry'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')

type VariantInfo = {
  lang: 'ko' | 'en'
  type: 'longform' | 'shorts'
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

  // 출력 파일 스캔
  const label = toPascal(episode)
  const outDir = path.join(REMOTION_ROOT, 'out', label)
  const variants: VariantInfo[] = []

  for (const lang of ['ko', 'en'] as const) {
    for (const type of ['longform', 'shorts'] as const) {
      const langCode = lang.toUpperCase()
      const typeCode = type === 'longform' ? 'L' : 'S'
      const langDir = path.join(outDir, langCode)

      const videoName = `${typeCode}-VID.mp4`
      const videoPath = path.join(langDir, videoName)

      const thumbName = `${typeCode}-THUMB.png`
      const thumbPath = path.join(langDir, thumbName)

      const srtName = `${typeCode}-VID.srt`
      const srtPath = path.join(langDir, srtName)

      let videoInfo: VariantInfo['video'] = null
      if (existsSync(videoPath)) {
        const s = await stat(videoPath)
        videoInfo = { exists: true, size: s.size, name: videoName }
      }

      variants.push({
        lang,
        type,
        video: videoInfo,
        srt: existsSync(srtPath) ? { exists: true, name: srtName } : null,
        thumb: existsSync(thumbPath) ? { exists: true, name: thumbName } : null,
      })
    }
  }

  // youtube-meta.json 읽기
  const metaPath = path.join(outDir, 'youtube-meta.json')
  let meta = null
  try {
    if (existsSync(metaPath)) meta = JSON.parse(await readFile(metaPath, 'utf-8'))
  } catch { /* ignore */ }

  return NextResponse.json({ auth, lineup: episodeMeta, variants, meta })
}
