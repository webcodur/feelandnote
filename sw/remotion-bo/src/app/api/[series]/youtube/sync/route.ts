import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getSeriesById, seriesDataModel } from '@/lib/series-registry'
import { ytGet, ytPut, YouTubeApiError } from '@/lib/youtube-client'
import { fetchPrivacyStatuses } from '@/lib/youtube-liveness'
import { buildTitle, buildDescription, buildTags, calcChapterTimestamps, buildYouTubeSnippet, type EpisodeMeta } from '@feelandnote/shared/lib/youtube-meta'
import { loadEpisode, toPascal } from '@/lib/server-utils'

// 실행 시점에만 도는 동적 라우트(렌더 산출물 out/ · scripts/ 를 fs로 읽고 씀). 빌드 타임 정적 분석·prerender 대상이 아님.
// 경로 상수를 모듈 최상위에 두면 Turbopack이 out/ 디렉토리를 번들 자산으로 추적하다 깨진다 → 사용처 함수 내부에서 런타임 계산.
export const dynamic = 'force-dynamic'

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

  const model = seriesDataModel(series)
  // 출고 기록(lineup)이 아직 없는 계열(담화 등) — 책 기반 경로로 조용히 새지 않게 막는다
  if (model !== 'book') return NextResponse.json({ error: `youtube sync not implemented: ${model}` }, { status: 501 })

  const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
  const LINEUP_PATH = path.join(REMOTION_ROOT, 'scripts', 'youtube', 'youtube-lineup.json')

  // lineup.json 로드
  let lineupAll: Record<string, EpisodeMeta> = {}
  try {
    if (existsSync(LINEUP_PATH)) lineupAll = JSON.parse(await readFile(LINEUP_PATH, 'utf-8'))
  } catch { /* ignore */ }

  // 옵션 2: variant는 1-based (ko-longform | ko-shorts-1 | ko-shorts-2 …)
  const toCheck: { name: string; variant: string; videoId: string; uploadedAt: string; channel: 'ko' | 'en' }[] = []
  for (const [name, meta] of Object.entries(lineupAll)) {
    if (!meta.uploads) continue
    for (const [variant, rec] of Object.entries(meta.uploads)) {
      const channel = variant.startsWith('en-') ? 'en' : 'ko'
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

      // 옵션 2: variant 키 파싱 — ko-longform | ko-shorts-1 | ko-shorts-2 … (1-based)
      const parts = item.variant.split('-')
      const lang = parts[0] as 'ko' | 'en'
      const type = (parts[1] === 'longform' ? 'longform' : 'shorts') as 'longform' | 'shorts'
      const shortsIndex = type === 'shorts' ? parseInt(parts[2] ?? '1', 10) : 0
      const isShorts = type === 'shorts'
      let localTitle = ''
      try {
        const epName = lang === 'en' ? `${name}-en` : name
        const ep = await loadEpisode(series, epName)
        const celebName = ep.host?.nickname ?? name

        // 쇼츠 타이틀 조립용 대표 책 제목.
        // shortsIndex는 고정 slot이지 배열 위치가 아니다 — 배열 순서로 집으면 엉뚱한 책이 잡힌다.
        // (실측: elon-musk의 shorts 배열 순서는 slot 1,6,2,3,4,8,5. shortsArr[1]은 slot 2가 아니라 6이다.)
        // CLI(youtube-upload.ts:180)·팩션(아래 440행)이 이미 slot 조회를 쓴다. 같은 방식으로 맞춘다.
        const shortsArr = Array.isArray(ep.shorts) ? ep.shorts : (ep.shorts ? [ep.shorts] : [])
        const targetShorts = isShorts ? shortsArr.find((s: any) => s?.slot === shortsIndex) : undefined
        const shortsBookTitle = isShorts
          ? ep.books?.[targetShorts?.featuredBookIndex ?? 0]?.title
          : undefined

        // 롱폼 신규 포맷 — 다부면 totalBooks + part, 단일 부면 books.length
        const isMultipart = (ep.series?.totalParts ?? 1) > 1
        const longformBookCount = isMultipart ? (ep.series?.totalBooks ?? ep.books?.length ?? 0) : (ep.books?.length ?? 0)
        const longformPart = isMultipart ? ep.series?.part : undefined

        // localTitle 은 항상 신규 포맷으로 재생성한다 — buildVariantPushData 와 동일.
        // youtube-meta.json override 사용 시, 푸시 후에도 옛 포맷과 비교되어 영원히 DRIFT 가 뜬다.
        localTitle = buildTitle(meta, celebName, lang, isShorts, shortsIndex, shortsBookTitle, longformBookCount, longformPart)
      } catch {
        // ep 로드 실패 — 책 수를 알 수 없으므로 longform 포맷을 만들 수 없다.
        // shorts일 때만 buildTitle을 호출하고, longform이면 placeholder 반환.
        if (isShorts) {
          localTitle = buildTitle(meta, '?', lang, isShorts, shortsIndex)
        } else {
          localTitle = lang === 'ko' ? '? 가 읽은 ?권의 책' : '? Books ? Read'
        }
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

  const model = seriesDataModel(series)
  if (model !== 'book') return NextResponse.json({ error: `youtube sync not implemented: ${model}` }, { status: 501 })

  const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
  const LINEUP_PATH = path.join(REMOTION_ROOT, 'scripts', 'youtube', 'youtube-lineup.json')

  const { action, episode, variant } = await req.json() as {
    action: 'push' | 'push-all' | 'preview' | 'preview-all' | 'remove' | 'purge'
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
        toCheck.push({ name, variant: vk, videoId: rec.videoId, channel: vk.startsWith('en-') ? 'en' : 'ko' })
      }
    }
    if (toCheck.length === 0) return NextResponse.json({ purged: 0 })

    // YouTube API로 존재 확인.
    // ⚠️ 조회가 실패하면 반드시 중단한다 — 실패를 "없음"으로 읽으면 전 기록이 한 번에 지워진다.
    const existing = new Set<string>()
    const byChannel: Record<string, typeof toCheck> = { ko: [], en: [] }
    for (const item of toCheck) byChannel[item.channel].push(item)

    for (const channel of ['ko', 'en'] as const) {
      const items = byChannel[channel]
      if (items.length === 0) continue
      try {
        const found = await fetchPrivacyStatuses(channel, items.map(b => b.videoId))
        for (const id of found.keys()) existing.add(id)
      } catch (e) {
        const msg = e instanceof YouTubeApiError ? e.message : String(e)
        return NextResponse.json({ error: `기록 정리 중단 — 유튜브 조회 실패로 삭제 여부를 확정할 수 없다: ${msg}` }, { status: 502 })
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
        await pushVariant(series, episode, vk, rec.videoId, meta)
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

  // ─── preview / preview-all: 푸시 시 적용될 메타 미리보기 ──
  if (action === 'preview-all') {
    if (!meta.uploads || Object.keys(meta.uploads).length === 0) {
      return NextResponse.json({ error: 'no uploads' }, { status: 400 })
    }
    const previews: VariantPreview[] = []
    for (const [vk, rec] of Object.entries(meta.uploads)) {
      try {
        const p = await previewVariant(series, episode, vk, rec.videoId, meta)
        previews.push(p)
      } catch (e: any) {
        previews.push({ variant: vk, videoId: rec.videoId, error: e.message })
      }
    }
    return NextResponse.json({ previews })
  }

  if (action === 'preview') {
    if (!variant) return NextResponse.json({ error: 'variant required' }, { status: 400 })
    const videoId = meta.uploads?.[variant]?.videoId
    if (!videoId) return NextResponse.json({ error: 'no upload record' }, { status: 400 })
    try {
      const p = await previewVariant(series, episode, variant, videoId, meta)
      return NextResponse.json({ previews: [p] })
    } catch (e: any) {
      return NextResponse.json({ previews: [{ variant, videoId, error: e.message }] })
    }
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

// ─── 미리보기 응답 타입 ─────────────────────────────────

export type VariantPreview = {
  variant: string
  videoId: string
  lang?: 'ko' | 'en'
  ytSnippet?: { title: string; description: string }
  newSnippet?: { title: string; description: string; tags: string[] }
  diffs?: ('title' | 'description' | 'tags')[]
  error?: string
}

// ─── 공통: variant 푸시 데이터 조립 ──────────────────────

type VariantPushData = {
  lang: 'ko' | 'en'
  shortsIndex: number
  snippet: { title: string; description: string; tags: string[]; categoryId: string; defaultLanguage: string; defaultAudioLanguage: string }
}

/**
 * variant 키와 lineup meta로 YouTube에 PUT 할 snippet을 조립한다.
 * 실제 API 호출은 하지 않는다. push/preview 양쪽에서 공유.
 */
async function buildVariantPushData(series: string, episode: string, variant: string, meta: EpisodeMeta): Promise<VariantPushData> {
  const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
  // 옵션 2: variant 키 파싱 — ko-longform | ko-shorts-1 | ko-shorts-2 … (1-based)
  const parts = variant.split('-')
  const lang = parts[0] as 'ko' | 'en'
  const type = (parts[1] === 'longform' ? 'longform' : 'shorts') as 'longform' | 'shorts'
  const shortsIndex = type === 'shorts' ? parseInt(parts[2] ?? '1', 10) : 0
  const isShorts = type === 'shorts'

  const epName = lang === 'en' ? `${episode}-en` : episode
  const ep = await loadEpisode(series, epName)
  const celebName = ep.host?.nickname ?? episode

  // 쇼츠 타이틀 조립용 대표 책 제목.
  // shortsIndex는 고정 slot이지 배열 위치가 아니다(위 131행 주석 참조).
  // 이 값이 메타 푸시로 실제 유튜브 영상 제목·설명에 박히므로 어긋나면 잘못된 메타가 나간다.
  const shortsArr = Array.isArray(ep.shorts) ? ep.shorts : (ep.shorts ? [ep.shorts] : [])
  const targetShorts = isShorts ? shortsArr.find((s: any) => s?.slot === shortsIndex) : undefined
  const shortsBookTitle = isShorts
    ? ep.books?.[targetShorts?.featuredBookIndex ?? 0]?.title
    : undefined

  const metaPath = path.join(REMOTION_ROOT, 'out', toPascal(episode), 'youtube-meta.json')
  let ytMeta: Record<string, { title?: string; description?: string; links?: { label: string; url: string }[] }> = {}
  try { if (existsSync(metaPath)) ytMeta = JSON.parse(await readFile(metaPath, 'utf-8')) } catch {}

  const chapters = !isShorts ? calcChapterTimestamps(ep, lang) : undefined
  const links = ytMeta[variant]?.links
  // 롱폼 신규 포맷 — 다부면 totalBooks + part, 단일 부면 books.length
  const isMultipart = (ep.series?.totalParts ?? 1) > 1
  const longformBookCount = isMultipart ? (ep.series?.totalBooks ?? ep.books?.length ?? 0) : (ep.books?.length ?? 0)
  const longformPart = isMultipart ? ep.series?.part : undefined
  // title/description 모두 항상 신규 포맷으로 재생성한다 — 저장된 override(youtube-meta.json)는 무시.
  // 과거에 자동 저장된 옛 포맷이 누적되어 있어 modal/푸시에 잔존하므로.
  const title = buildTitle(meta, celebName, lang, isShorts, shortsIndex, shortsBookTitle, longformBookCount, longformPart)
  const featuredBookIndex = isShorts ? (targetShorts?.featuredBookIndex ?? 0) : undefined
  const description = buildDescription(celebName, ep.books ?? [], lang, isShorts, chapters, links, episode, shortsIndex, featuredBookIndex)

  const tags = buildTags(celebName, lang, isShorts, shortsIndex)
  const snippet = buildYouTubeSnippet({ title, description, tags, lang, shortsIndex })

  return { lang, shortsIndex, snippet }
}

// ─── pushVariant: 단일 variant 메타 푸시 ────────────────

async function pushVariant(series: string, episode: string, variant: string, videoId: string, meta: EpisodeMeta) {
  const { lang, snippet } = await buildVariantPushData(series, episode, variant, meta)
  return ytPut(lang, 'videos', { part: 'snippet' }, {
    id: videoId,
    snippet,
  })
}

// ─── previewVariant: 푸시 전 미리보기 ───────────────────

async function previewVariant(series: string, episode: string, variant: string, videoId: string, meta: EpisodeMeta): Promise<VariantPreview> {
  const { lang, snippet } = await buildVariantPushData(series, episode, variant, meta)

  // 현재 YouTube 상태 조회
  let ytSnippet: { title: string; description: string } | undefined
  try {
    const data = await ytGet<YTListResponse>(lang, 'videos', { part: 'snippet', id: videoId })
    const item = data?.items?.[0]
    if (item) ytSnippet = { title: item.snippet.title, description: item.snippet.description }
  } catch { /* ignore — 미리보기는 YouTube 조회 실패해도 신규 값은 보여준다 */ }

  const diffs: ('title' | 'description' | 'tags')[] = []
  if (ytSnippet) {
    if (ytSnippet.title !== snippet.title) diffs.push('title')
    if (ytSnippet.description !== snippet.description) diffs.push('description')
  }

  return {
    variant,
    videoId,
    lang,
    ytSnippet,
    newSnippet: { title: snippet.title, description: snippet.description, tags: snippet.tags },
    diffs,
  }
}
