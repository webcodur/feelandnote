/**
 * Spotify → iTunes 이전 정밀 감사용 일회성 분류기.
 * 백업에 남은 원래 Spotify ID가 track인지 album인지 공식 oEmbed로 판정하고
 * .codex/runtime에 재개 가능한 캐시를 남긴다. 서비스 런타임에서는 사용하지 않는다.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

dotenv.config({ path: resolve(process.cwd(), '.env'), quiet: true })

const RUNTIME_DIR = resolve(process.cwd(), '../../.codex/runtime')
const CACHE_PATH = resolve(RUNTIME_DIR, 'spotify-music-entity-cache.json')
const STATE_PATH = resolve(RUNTIME_DIR, 'spotify-music-entity-state.json')
const REQUEST_INTERVAL_MS = 400
const RETRY_DELAYS_MS = [3000, 15000, 65000]

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
let nextRequestAt = 0

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  const tempPath = `${path}.next`
  const backupPath = `${path}.previous`
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  let lastError = null
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await rename(tempPath, path)
      return
    } catch (error) {
      lastError = error
    }
    let previousMoved = false
    try {
      await rm(backupPath, { force: true })
      await rename(path, backupPath)
      previousMoved = true
      await rename(tempPath, path)
      return
    } catch (error) {
      lastError = error
      if (previousMoved) {
        try { await rename(backupPath, path) } catch { /* 다음 재시도에서 복구한다. */ }
      }
      await sleep(50 * (attempt + 1))
    }
  }
  throw lastError || new Error(`상태 파일 교체 실패: ${path}`)
}

async function readJson(path, fallback) {
  let lastError = null
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return JSON.parse(await readFile(path, 'utf8'))
    } catch (error) {
      lastError = error
      if (error?.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error
      await sleep(40 * (attempt + 1))
    }
  }
  try {
    return JSON.parse(await readFile(`${path}.previous`, 'utf8'))
  } catch (backupError) {
    if (lastError?.code === 'ENOENT' && backupError?.code === 'ENOENT') return fallback
    throw lastError || backupError
  }
}

async function loadAll(table, select, configure = (query) => query) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await configure(sb.from(table).select(select))
      .range(from, from + 999)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    rows.push(...(data || []))
    if ((data || []).length < 1000) break
  }
  return rows
}

function spotifyId(value) {
  return String(value || '').replace(/^spotify[-_:]/i, '')
}

function entityFromBackup(rows, id) {
  for (const row of rows) {
    const url = row.sources?.url
    const match = typeof url === 'string'
      ? url.match(/open\.spotify\.com\/(track|album)\/([A-Za-z0-9]+)/i)
      : null
    if (match && match[2] === id) return match[1].toLowerCase()
  }
  return null
}

async function waitForSlot() {
  const waitMs = Math.max(0, nextRequestAt - Date.now())
  if (waitMs) await sleep(waitMs)
  nextRequestAt = Date.now() + REQUEST_INTERVAL_MS
}

async function oembed(entity, id) {
  const spotifyUrl = `https://open.spotify.com/${entity}/${id}`
  const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`

  for (let attempt = 0; ; attempt++) {
    await waitForSlot()
    const response = await fetch(url, { headers: { 'User-Agent': 'feelandnote-migration/1.0' } })
    if (response.status === 404) return null
    if ((response.status === 429 || response.status >= 500) && attempt < RETRY_DELAYS_MS.length) {
      const retryAfter = Number(response.headers.get('retry-after'))
      const waitMs = Number.isFinite(retryAfter) && retryAfter >= 0
        ? Math.max(retryAfter * 1000, RETRY_DELAYS_MS[attempt])
        : RETRY_DELAYS_MS[attempt]
      nextRequestAt = Date.now() + waitMs
      continue
    }
    if (!response.ok) throw new Error(`Spotify oEmbed ${response.status}: ${entity}/${id}`)
    const body = await response.json()
    const embedEntity = body.html?.match(/open\.spotify\.com\/embed\/(track|album)\//i)?.[1]?.toLowerCase()
    if (embedEntity !== entity) throw new Error(`Spotify oEmbed 엔티티 불일치: ${entity}/${id}`)
    return { title: body.title || null, thumbnailUrl: body.thumbnail_url || null }
  }
}

async function embedIdentity(entity, id) {
  const url = `https://open.spotify.com/embed/${entity}/${id}`
  for (let attempt = 0; ; attempt++) {
    await waitForSlot()
    const response = await fetch(url, { headers: { 'User-Agent': 'feelandnote-migration/1.0' } })
    if (response.status === 404) return null
    if ((response.status === 429 || response.status >= 500) && attempt < RETRY_DELAYS_MS.length) {
      const retryAfter = Number(response.headers.get('retry-after'))
      const waitMs = Number.isFinite(retryAfter) && retryAfter >= 0
        ? Math.max(retryAfter * 1000, RETRY_DELAYS_MS[attempt])
        : RETRY_DELAYS_MS[attempt]
      nextRequestAt = Date.now() + waitMs
      continue
    }
    if (!response.ok) throw new Error(`Spotify Embed ${response.status}: ${entity}/${id}`)
    const html = await response.text()
    const raw = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1]
    if (!raw) throw new Error(`Spotify Embed 데이터 없음: ${entity}/${id}`)
    const embedded = JSON.parse(raw)?.props?.pageProps?.state?.data?.entity
    if (!embedded || embedded.type !== entity) throw new Error(`Spotify Embed 엔티티 불일치: ${entity}/${id}`)
    const artists = entity === 'track'
      ? (embedded.artists || []).map((artist) => artist.name).filter(Boolean)
      : [embedded.subtitle].filter(Boolean)
    const tracks = entity === 'album' && Array.isArray(embedded.trackList)
      ? embedded.trackList.map((track) => ({
          title: track.title || '',
          durationMs: Number(track.duration) || 0,
        })).filter((track) => track.title)
      : null
    return {
      title: embedded.title || embedded.name || null,
      artists,
      releaseDate: embedded.releaseDate?.isoString?.slice(0, 10) || null,
      trackCount: tracks?.length || null,
      tracks,
    }
  }
}

async function resilientEmbedIdentity(entity, id) {
  let lastError = null
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await embedIdentity(entity, id)
    } catch (error) {
      lastError = error
      if (attempt === RETRY_DELAYS_MS.length) break
      nextRequestAt = Date.now() + RETRY_DELAYS_MS[attempt]
    }
  }
  throw lastError
}

async function classify(id, backupRows) {
  const backupEntity = entityFromBackup(backupRows, id)
  if (backupEntity) {
    return { entity: backupEntity, source: 'backup_url', title: null, thumbnailUrl: null }
  }

  const track = await oembed('track', id)
  if (track) return { entity: 'track', source: 'oembed', ...track }
  const album = await oembed('album', id)
  if (album) return { entity: 'album', source: 'oembed', ...album }
  return { entity: 'unknown', source: 'oembed', title: null, thumbnailUrl: null }
}

async function main() {
  const [contents, backup] = await Promise.all([
    loadAll('contents', 'id,external_id,external_source', (query) => query.eq('type', 'MUSIC')),
    loadAll(
      'meta_reharvest_backup_20260801',
      'content_id,external_id,external_source,locale,title,creator,sources',
      (query) => query.eq('type', 'MUSIC').eq('external_source', 'spotify')
    ),
  ])

  const contentById = new Map(contents.map((row) => [row.id, row]))
  const backupByContent = new Map()
  for (const row of backup) {
    if (!contentById.has(row.content_id)) continue
    const rows = backupByContent.get(row.content_id) || []
    rows.push(row)
    backupByContent.set(row.content_id, rows)
  }

  const originals = [...backupByContent.entries()].map(([contentId, rows]) => ({
    contentId,
    spotifyId: spotifyId(rows[0]?.external_id),
    rows,
    current: contentById.get(contentId),
  })).filter((item) => /^[A-Za-z0-9]{22}$/.test(item.spotifyId))

  const cache = await readJson(CACHE_PATH, { version: 1, items: {} })
  let completed = Object.keys(cache.items || {}).length
  await writeJson(STATE_PATH, {
    status: 'running',
    total: originals.length,
    completed,
    updatedAt: new Date().toISOString(),
  })

  for (const item of originals) {
    if (cache.items[item.contentId]?.spotifyId === item.spotifyId) continue
    const result = await classify(item.spotifyId, item.rows)
    cache.items[item.contentId] = {
      spotifyId: item.spotifyId,
      currentSource: item.current.external_source,
      currentExternalId: item.current.external_id,
      ...result,
      checkedAt: new Date().toISOString(),
    }
    completed++
    if (completed % 10 === 0 || completed === originals.length) {
      await writeJson(CACHE_PATH, cache)
      await writeJson(STATE_PATH, {
        status: 'running',
        total: originals.length,
        completed,
        updatedAt: new Date().toISOString(),
      })
      console.log(`분류 ${completed}/${originals.length}`)
    }
  }

  const identityComplete = (cached) => cached?.identityCheckedAt
    && !cached.identityError
    && (cached.entity !== 'album' || Array.isArray(cached.spotifyTracks))
  let identityCompleted = originals.filter((item) => identityComplete(cache.items[item.contentId])).length
  await writeJson(STATE_PATH, {
    status: 'running',
    stage: 'identity',
    total: originals.length,
    completed: originals.length,
    identityCompleted,
    updatedAt: new Date().toISOString(),
  })
  for (const item of originals) {
    const cached = cache.items[item.contentId]
    if (!cached || identityComplete(cached)) continue
    let identity = null
    let identityError = null
    if (cached.entity === 'track' || cached.entity === 'album') {
      try {
        identity = await resilientEmbedIdentity(cached.entity, item.spotifyId)
      } catch (error) {
        identityError = error instanceof Error ? error.message : String(error)
      }
    }
    cached.spotifyTitle = identity?.title || cached.title || null
    cached.spotifyArtists = identity?.artists || []
    cached.spotifyReleaseDate = identity?.releaseDate || null
    cached.spotifyTrackCount = identity?.trackCount || null
    cached.spotifyTracks = identity?.tracks || null
    cached.identityError = identityError
    cached.identityCheckedAt = new Date().toISOString()
    identityCompleted++
    if (identityCompleted % 10 === 0 || identityCompleted === originals.length) {
      await writeJson(CACHE_PATH, cache)
      await writeJson(STATE_PATH, {
        status: 'running',
        stage: 'identity',
        total: originals.length,
        completed: originals.length,
        identityCompleted,
        updatedAt: new Date().toISOString(),
      })
      console.log(`정체성 대조 ${identityCompleted}/${originals.length}`)
    }
  }

  const summary = {}
  let identityErrors = 0
  for (const item of originals) {
    const result = cache.items[item.contentId]
    const key = `${item.current.external_source}:${result?.entity || 'missing'}`
    summary[key] = (summary[key] || 0) + 1
    if (result?.identityError) identityErrors++
  }
  await writeJson(CACHE_PATH, cache)
  await writeJson(STATE_PATH, {
    status: 'complete',
    total: originals.length,
    completed: originals.length,
    identityCompleted: originals.length,
    identityErrors,
    summary,
    updatedAt: new Date().toISOString(),
  })
  console.log(JSON.stringify(summary, null, 2))
}

main().catch(async (error) => {
  await writeJson(STATE_PATH, {
    status: 'error',
    error: error instanceof Error ? error.message : String(error),
    updatedAt: new Date().toISOString(),
  })
  console.error(error)
  process.exit(1)
})
