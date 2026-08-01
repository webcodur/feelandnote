import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { REMOTION_ROOT } from '@feelandnote/shared/bo/remotion-root'
import { ytGet, ytPut } from '@/lib/youtube-client'
import {
  factionVariants,
  buildFactionTitle,
  buildFactionDescription,
  buildFactionTags,
  buildFactionSnippet,
  type FactionMetaInput,
} from '@feelandnote/shared/lib/youtube-faction-meta'
import { guardFactionRoute } from '@/lib/faction-route'
// 원천 교체 — 에피소드 데이터를 파일(loadFactionEpisode)이 아니라 DB 에서 조립한다.
// 메타를 유튜브로 밀어넣기 직전에는 ensureFactionExport 로 파일도 DB 와 맞춰 둔다.
import { loadFactionScriptFromDb, ensureFactionExport } from '@/lib/faction-episode-data'

// 실행 시점에만 도는 동적 라우트(렌더 산출물 out/ · scripts/ 를 fs로 읽고 씀). 빌드 타임 정적 분석·prerender 대상이 아님.
// 경로 상수를 모듈 최상위에 두면 Turbopack이 out/ 디렉토리를 번들 자산으로 추적하다 깨진다 → 사용처 함수 내부에서 런타임 계산.
// (렌더 저장소 뿌리만 공용 부품 REMOTION_ROOT 로 바꿨다 — youtube-client 와 같은 원천을 쓰고 환경변수 덮어쓰기를 지원한다.)
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

// ─── GET: 동기화 상태 확인 ──────────────────────────────

export async function GET() {
  const denied = await guardFactionRoute()
  if (denied) return denied

  return factionSyncGet()
}

// ─── POST: 동기화 액션 ──────────────────────────────────

export async function POST(req: Request) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  return factionSyncPost(req)
}

// ─── 세력도감(Faction) 동기화 ─────────────────────────────

type FactionLineup = Record<string, { uploads?: Record<string, { videoId: string; uploadedAt: string }> }>

function factionLineupPath() {
  return path.join(REMOTION_ROOT, 'scripts', 'youtube', 'faction-lineup.json')
}

async function readFactionLineup(): Promise<FactionLineup> {
  const FACTION_LINEUP_PATH = factionLineupPath()
  try {
    if (existsSync(FACTION_LINEUP_PATH)) return JSON.parse(await readFile(FACTION_LINEUP_PATH, 'utf-8'))
  } catch { /* ignore */ }
  return {}
}

function factionVariantOf(data: FactionMetaInput, variantKey: string) {
  return factionVariants(data.groups, data.longformLayout).find(v => v.key === variantKey)
}

/** 에피소드 데이터(DB) + variant 로 YouTube 에 PUT 할 snippet 조립 */
async function factionSnippetFor(episode: string, variantKey: string) {
  const data = await loadFactionScriptFromDb(episode) as unknown as FactionMetaInput
  const v = factionVariantOf(data, variantKey)
  const isShorts = v?.isShorts ?? variantKey.includes('shorts')
  const part = v?.part
  const lvPart = v?.lvPart
  const title = buildFactionTitle(data, 'ko', isShorts, part, lvPart)
  const description = buildFactionDescription(data, 'ko', isShorts, part, lvPart)
  const tags = buildFactionTags(data, 'ko', isShorts, part, lvPart)
  return buildFactionSnippet({ title, description, tags, lang: 'ko' })
}

async function factionSyncGet() {
  const lineupAll = await readFactionLineup()
  const toCheck: { name: string; variant: string; videoId: string; uploadedAt: string }[] = []
  for (const [name, meta] of Object.entries(lineupAll)) {
    if (!meta.uploads) continue
    for (const [variant, rec] of Object.entries(meta.uploads)) {
      toCheck.push({ name, variant, videoId: rec.videoId, uploadedAt: rec.uploadedAt })
    }
  }
  if (toCheck.length === 0) return NextResponse.json({ results: [], message: '업로드 기록 없음' })

  const ytVideos = new Map<string, YTVideoItem>()
  for (let i = 0; i < toCheck.length; i += 50) {
    const batch = toCheck.slice(i, i + 50)
    const ids = batch.map(b => b.videoId).join(',')
    const data = await ytGet<YTListResponse>('ko', 'videos', { part: 'snippet', id: ids })
    if (data?.items) for (const v of data.items) ytVideos.set(v.id, v)
  }

  const results: EpisodeSyncResult[] = []
  const names = [...new Set(toCheck.map(t => t.name))]
  for (const name of names) {
    const variants: VariantSync[] = []
    for (const item of toCheck.filter(t => t.name === name)) {
      const ytVideo = ytVideos.get(item.videoId)
      if (!ytVideo) {
        variants.push({ variant: item.variant, status: 'deleted', videoId: item.videoId, uploadedAt: item.uploadedAt })
        continue
      }
      let localTitle = ''
      try {
        const data = await loadFactionScriptFromDb(name) as unknown as FactionMetaInput
        const v = factionVariantOf(data, item.variant)
        localTitle = buildFactionTitle(data, 'ko', v?.isShorts ?? item.variant.includes('shorts'), v?.part, v?.lvPart)
      } catch { localTitle = '?' }
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

async function factionSyncPost(req: Request) {
  const { action, episode, variant } = await req.json() as {
    action: 'push' | 'push-all' | 'preview' | 'preview-all' | 'remove' | 'purge'
    episode?: string
    variant?: string
  }
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  const FACTION_LINEUP_PATH = factionLineupPath()
  const lineupAll = await readFactionLineup()

  if (action === 'purge') {
    const toCheck: { name: string; variant: string; videoId: string }[] = []
    for (const [name, meta] of Object.entries(lineupAll)) {
      if (!meta.uploads) continue
      for (const [vk, rec] of Object.entries(meta.uploads)) toCheck.push({ name, variant: vk, videoId: rec.videoId })
    }
    if (toCheck.length === 0) return NextResponse.json({ purged: 0 })
    const existing = new Set<string>()
    for (let i = 0; i < toCheck.length; i += 50) {
      const batch = toCheck.slice(i, i + 50)
      const ids = batch.map(b => b.videoId).join(',')
      const data = await ytGet<YTListResponse>('ko', 'videos', { part: 'id', id: ids })
      if (data?.items) for (const v of data.items) existing.add(v.id)
    }
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
    if (purged > 0) await writeFile(FACTION_LINEUP_PATH, JSON.stringify(lineupAll, null, 2) + '\n', 'utf-8')
    return NextResponse.json({ purged })
  }

  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })
  const meta = lineupAll[episode]
  if (!meta) return NextResponse.json({ error: 'episode not in lineup' }, { status: 404 })

  if (action === 'remove') {
    if (!variant) return NextResponse.json({ error: 'variant required' }, { status: 400 })
    if (meta.uploads?.[variant]) {
      delete meta.uploads[variant]
      if (Object.keys(meta.uploads).length === 0) delete meta.uploads
      await writeFile(FACTION_LINEUP_PATH, JSON.stringify(lineupAll, null, 2) + '\n', 'utf-8')
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'push-all') {
    if (!meta.uploads || Object.keys(meta.uploads).length === 0) return NextResponse.json({ error: 'no uploads' }, { status: 400 })
    // 메타 밀어넣기 직전 — 실행 스크립트가 읽는 파일도 DB 와 맞춰 둔다(파일·유튜브가 서로 어긋나지 않게).
    const blocked = await ensureFactionExport(episode)
    if (blocked) return NextResponse.json({ error: blocked }, { status: 400 })
    const results: { variant: string; ok: boolean; error?: string }[] = []
    for (const [vk, rec] of Object.entries(meta.uploads)) {
      try {
        const snippet = await factionSnippetFor(episode, vk)
        const r = await ytPut('ko', 'videos', { part: 'snippet' }, { id: rec.videoId, snippet })
        results.push({ variant: vk, ok: !!r })
      // 원본은 `catch (e: any)` 였다 — 이 앱 검사기가 any 를 거부해 형태만 바꿨다(동작 동일).
      } catch (e) { results.push({ variant: vk, ok: false, error: e instanceof Error ? e.message : String(e) }) }
    }
    return NextResponse.json({ results })
  }

  if (action === 'push') {
    if (!variant) return NextResponse.json({ error: 'variant required' }, { status: 400 })
    const videoId = meta.uploads?.[variant]?.videoId
    if (!videoId) return NextResponse.json({ error: 'no upload record' }, { status: 400 })
    // 메타 밀어넣기 직전 — 위 push-all 과 같은 이유.
    const blocked = await ensureFactionExport(episode)
    if (blocked) return NextResponse.json({ error: blocked }, { status: 400 })
    const snippet = await factionSnippetFor(episode, variant)
    const r = await ytPut('ko', 'videos', { part: 'snippet' }, { id: videoId, snippet })
    if (!r) return NextResponse.json({ error: 'YouTube API 호출 실패' }, { status: 502 })
    return NextResponse.json({ ok: true, videoId })
  }

  if (action === 'preview-all' || action === 'preview') {
    const entries: Array<readonly [string, { videoId: string; uploadedAt: string }]> = action === 'preview'
      ? (variant && meta.uploads?.[variant] ? [[variant, meta.uploads[variant]] as const] : [])
      : Object.entries(meta.uploads ?? {})
    if (entries.length === 0) return NextResponse.json({ error: 'no uploads' }, { status: 400 })
    const previews: VariantPreview[] = []
    for (const [vk, rec] of entries) {
      try {
        const snippet = await factionSnippetFor(episode, vk)
        let ytSnippet: { title: string; description: string } | undefined
        try {
          const data = await ytGet<YTListResponse>('ko', 'videos', { part: 'snippet', id: rec.videoId })
          const item = data?.items?.[0]
          if (item) ytSnippet = { title: item.snippet.title, description: item.snippet.description }
        } catch { /* ignore */ }
        const diffs: ('title' | 'description' | 'tags')[] = []
        if (ytSnippet) {
          if (ytSnippet.title !== snippet.title) diffs.push('title')
          if (ytSnippet.description !== snippet.description) diffs.push('description')
        }
        previews.push({ variant: vk, videoId: rec.videoId, lang: 'ko', ytSnippet, newSnippet: { title: snippet.title, description: snippet.description, tags: snippet.tags }, diffs })
      // 원본은 `catch (e: any)` 였다 — 이 앱 검사기가 any 를 거부해 형태만 바꿨다(동작 동일).
      } catch (e) {
        previews.push({ variant: vk, videoId: rec.videoId, error: e instanceof Error ? e.message : String(e) })
      }
    }
    return NextResponse.json({ previews })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
