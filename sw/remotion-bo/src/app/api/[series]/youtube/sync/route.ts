import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getSeriesById } from '@/lib/series-registry'
import { ytGet, ytPut } from '@/lib/youtube-client'
import { buildTitle, buildDescription, buildTags, calcChapterTimestamps, buildYouTubeSnippet, type EpisodeMeta } from '@feelandnote/shared/lib/youtube-meta'
import { loadEpisode, toPascal } from '@/lib/server-utils'

const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
const LINEUP_PATH = path.join(REMOTION_ROOT, 'scripts', 'youtube', 'youtube-lineup.json')

type YTVideoItem = {
  id: string
  snippet: { title: string; description: string; categoryId: string }
}
type YTListResponse = { items?: YTVideoItem[] }

export type SyncStatus = 'synced' | 'drift' | 'deleted' | 'not_uploaded' | 'error'

export type VariantSync = {
  variant: string
  status: SyncStatus
  videoId?: string
  uploadedAt?: string
  diffs?: string[]        // 차이 항목 ('title', ...)
  ytTitle?: string        // YouTube 현재 제목
  localTitle?: string
}

export type EpisodeSyncResult = {
  name: string
  variants: VariantSync[]
}

// ─── GET: 동기화 상태 확인 ──────────────────────────────

export async function GET(_req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!getSeriesById(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  // lineup.json 로드
  let lineupAll: Record<string, EpisodeMeta> = {}
  try {
    if (existsSync(LINEUP_PATH)) lineupAll = JSON.parse(await readFile(LINEUP_PATH, 'utf-8'))
  } catch { /* ignore */ }

  // 업로드 기록이 있는 에피소드만 수집
  const toCheck: { name: string; variant: string; videoId: string; uploadedAt: string; channel: 'ko' | 'en' }[] = []
  for (const [name, meta] of Object.entries(lineupAll)) {
    if (!meta.uploads) continue
    for (const [variant, rec] of Object.entries(meta.uploads)) {
      const channel = variant.startsWith('en') ? 'en' : 'ko'
      toCheck.push({ name, variant, videoId: rec.videoId, uploadedAt: rec.uploadedAt, channel })
    }
  }

  if (toCheck.length === 0) {
    return NextResponse.json({ results: [], message: '업로드 기록 없음' })
  }

  // 채널별로 videoId를 묶어서 batch 조회 (최대 50개씩)
  const byChannel: Record<string, typeof toCheck> = { ko: [], en: [] }
  for (const item of toCheck) byChannel[item.channel].push(item)

  const ytVideos = new Map<string, YTVideoItem>()

  for (const channel of ['ko', 'en'] as const) {
    const items = byChannel[channel]
    if (items.length === 0) continue

    // 50개씩 batch
    for (let i = 0; i < items.length; i += 50) {
      const batch = items.slice(i, i + 50)
      const ids = batch.map(b => b.videoId).join(',')
      const data = await ytGet<YTListResponse>(channel, 'videos', { part: 'snippet', id: ids })
      if (data?.items) {
        for (const v of data.items) ytVideos.set(v.id, v)
      }
    }
  }

  // 로컬 메타와 비교
  const results: EpisodeSyncResult[] = []
  const episodeNames = [...new Set(toCheck.map(t => t.name))]

  for (const name of episodeNames) {
    const meta = lineupAll[name]
    const variants: VariantSync[] = []

    for (const item of toCheck.filter(t => t.name === name)) {
      const ytVideo = ytVideos.get(item.videoId)

      if (!ytVideo) {
        variants.push({ variant: item.variant, status: 'deleted', videoId: item.videoId, uploadedAt: item.uploadedAt })
        continue
      }

      // 로컬 제목 생성
      const [lang, type] = item.variant.split('-') as ['ko' | 'en', 'longform' | 'shorts']
      const isShorts = type === 'shorts'
      let localTitle = ''
      try {
        const epName = lang === 'en' ? `${name}-en` : name
        const ep = await loadEpisode(series, epName)
        const celebName = ep.host?.nickname ?? name

        // youtube-meta.json 커스텀 확인
        const metaPath = path.join(REMOTION_ROOT, 'out', toPascal(name), 'youtube-meta.json')
        let ytMeta: Record<string, { title?: string }> = {}
        try { if (existsSync(metaPath)) ytMeta = JSON.parse(await readFile(metaPath, 'utf-8')) } catch {}

        localTitle = ytMeta[item.variant]?.title ?? buildTitle(meta, celebName, lang, isShorts)
      } catch {
        localTitle = buildTitle(meta, '?', lang, isShorts)
      }

      const diffs: string[] = []
      if (ytVideo.snippet.title !== localTitle) diffs.push('title')

      variants.push({
        variant: item.variant,
        status: diffs.length > 0 ? 'drift' : 'synced',
        videoId: item.videoId,
        uploadedAt: item.uploadedAt,
        diffs,
        ytTitle: ytVideo.snippet.title,
        localTitle,
      })
    }

    results.push({ name, variants })
  }

  return NextResponse.json({ results })
}

// ─── POST: 동기화 액션 ──────────────────────────────────

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!getSeriesById(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { action, episode, variant } = await req.json() as {
    action: 'push' | 'push-all' | 'remove' | 'purge'
    episode?: string
    variant?: string
  }

  if (!action) {
    return NextResponse.json({ error: 'action required' }, { status: 400 })
  }

  let lineupAll: Record<string, EpisodeMeta> = {}
  try {
    if (existsSync(LINEUP_PATH)) lineupAll = JSON.parse(await readFile(LINEUP_PATH, 'utf-8'))
  } catch { /* ignore */ }

  // ─── purge: 삭제된 영상 기록 일괄 제거 ─────────────────
  if (action === 'purge') {
    const toCheck: { name: string; variant: string; videoId: string; channel: 'ko' | 'en' }[] = []
    for (const [name, meta] of Object.entries(lineupAll)) {
      if (!meta.uploads) continue
      for (const [vk, rec] of Object.entries(meta.uploads)) {
        toCheck.push({ name, variant: vk, videoId: rec.videoId, channel: vk.startsWith('en') ? 'en' : 'ko' })
      }
    }
    if (toCheck.length === 0) return NextResponse.json({ purged: 0 })

    // YouTube API로 존재 확인
    const existing = new Set<string>()
    const byChannel: Record<string, typeof toCheck> = { ko: [], en: [] }
    for (const item of toCheck) byChannel[item.channel].push(item)

    for (const channel of ['ko', 'en'] as const) {
      const items = byChannel[channel]
      if (items.length === 0) continue
      for (let i = 0; i < items.length; i += 50) {
        const batch = items.slice(i, i + 50)
        const ids = batch.map(b => b.videoId).join(',')
        const data = await ytGet<YTListResponse>(channel, 'videos', { part: 'id', id: ids })
        if (data?.items) for (const v of data.items) existing.add(v.id)
      }
    }

    // 삭제된 영상 기록 제거
    let purged = 0
    for (const item of toCheck) {
      if (!existing.has(item.videoId)) {
        const m = lineupAll[item.name]
        if (m?.uploads?.[item.variant]) {
          delete m.uploads[item.variant]
          if (Object.keys(m.uploads).length === 0) delete m.uploads
          purged++
        }
      }
    }
    if (purged > 0) {
      await writeFile(LINEUP_PATH, JSON.stringify(lineupAll, null, 2) + '\n', 'utf-8')
    }
    return NextResponse.json({ purged })
  }

  if (!episode) {
    return NextResponse.json({ error: 'episode required' }, { status: 400 })
  }

  const meta = lineupAll[episode]
  if (!meta) return NextResponse.json({ error: 'episode not in lineup' }, { status: 404 })

  if (action === 'remove') {
    if (!variant) return NextResponse.json({ error: 'variant required' }, { status: 400 })
    // 업로드 레코드 삭제
    if (meta.uploads?.[variant]) {
      delete meta.uploads[variant]
      if (Object.keys(meta.uploads).length === 0) delete meta.uploads
      await writeFile(LINEUP_PATH, JSON.stringify(lineupAll, null, 2) + '\n', 'utf-8')
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'push-all') {
    if (!meta.uploads || Object.keys(meta.uploads).length === 0) {
      return NextResponse.json({ error: 'no uploads' }, { status: 400 })
    }
    const results: { variant: string; ok: boolean; error?: string }[] = []
    for (const [vk, rec] of Object.entries(meta.uploads)) {
      try {
        const res = await pushVariant(series, episode, vk, rec.videoId, meta)
        results.push({ variant: vk, ok: true })
      } catch (e: any) {
        results.push({ variant: vk, ok: false, error: e.message })
      }
    }
    return NextResponse.json({ results })
  }

  if (action === 'push') {
    if (!variant) return NextResponse.json({ error: 'variant required' }, { status: 400 })
    const videoId = meta.uploads?.[variant]?.videoId
    if (!videoId) return NextResponse.json({ error: 'no upload record' }, { status: 400 })
    const result = await pushVariant(series, episode, variant, videoId, meta)
    if (!result) return NextResponse.json({ error: 'YouTube API 호출 실패' }, { status: 502 })
    return NextResponse.json({ ok: true, videoId })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

// ─── pushVariant: 단일 variant 메타 푸시 ────────────────

async function pushVariant(series: string, episode: string, variant: string, videoId: string, meta: EpisodeMeta) {
  const [lang, type] = variant.split('-') as ['ko' | 'en', 'longform' | 'shorts']
  const isShorts = type === 'shorts'

  const epName = lang === 'en' ? `${episode}-en` : episode
  const ep = await loadEpisode(series, epName)
  const celebName = ep.host?.nickname ?? episode

  const metaPath = path.join(REMOTION_ROOT, 'out', toPascal(episode), 'youtube-meta.json')
  let ytMeta: Record<string, { title?: string; description?: string; links?: { label: string; url: string }[] }> = {}
  try { if (existsSync(metaPath)) ytMeta = JSON.parse(await readFile(metaPath, 'utf-8')) } catch {}

  const chapters = !isShorts ? calcChapterTimestamps(ep, lang) : undefined
  const links = ytMeta[variant]?.links
  const title = ytMeta[variant]?.title ?? buildTitle(meta, celebName, lang, isShorts)
  const description = ytMeta[variant]?.description ?? buildDescription(celebName, ep.books ?? [], lang, isShorts, chapters, links, episode)

  const tags = buildTags(celebName, lang, isShorts)
  const snippet = buildYouTubeSnippet({ title, description, tags, lang })

  return ytPut(lang, 'videos', { part: 'snippet' }, {
    id: videoId,
    snippet,
  })
}
