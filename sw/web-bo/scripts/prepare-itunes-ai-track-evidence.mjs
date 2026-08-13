/** AI 건별 검수를 위한 트랙 증거 묶음 생성. DB는 읽거나 쓰지 않는다. */

import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { chunkByCount } from './lib/itunes-batch.mjs'

const RUNTIME_DIR = resolve(process.cwd(), '../../.codex/runtime')
const STATE_PATH = resolve(RUNTIME_DIR, 'itunes-music-precision-state.json')
const ENTITY_PATH = resolve(RUNTIME_DIR, 'spotify-music-entity-cache.json')
const API_CACHE_PATH = resolve(RUNTIME_DIR, 'itunes-music-api-cache.jsonl')
const EVIDENCE_PATH = resolve(RUNTIME_DIR, 'itunes-music-ai-track-evidence.json')
const REVIEWABLE = new Set(['ambiguous', 'no_match', 'no_preview', 'ambiguous_entity', 'no_results'])
const APPLE_INTERVAL_MS = 3500

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms))

async function readJson(path, fallback = null) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch (error) {
    if (error?.code === 'ENOENT') return fallback
    throw error
  }
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.next`
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temp, path)
}

function spotifyEntityFromHtml(html) {
  const marker = '<script id="__NEXT_DATA__" type="application/json">'
  const start = html.indexOf(marker)
  const end = start >= 0 ? html.indexOf('</script>', start + marker.length) : -1
  if (start < 0 || end < 0) throw new Error('Spotify NEXT_DATA 없음')
  return JSON.parse(html.slice(start + marker.length, end))?.props?.pageProps?.state?.data?.entity
}

async function spotifyDuration(spotifyId) {
  const response = await fetch(`https://open.spotify.com/embed/track/${spotifyId}`, {
    headers: { 'User-Agent': 'feelandnote-migration/1.0' },
  })
  if (!response.ok) throw new Error(`Spotify Embed ${response.status}: ${spotifyId}`)
  const entity = spotifyEntityFromHtml(await response.text())
  if (entity?.type !== 'track') throw new Error(`Spotify 트랙 정체 불일치: ${spotifyId}`)
  return Number(entity.duration) || null
}

async function loadAppleRows() {
  const rows = new Map()
  try {
    const lines = (await readFile(API_CACHE_PATH, 'utf8')).split(/\r?\n/).filter(Boolean)
    for (const line of lines) {
      try {
        for (const result of JSON.parse(line).results || []) {
          if (Number.isInteger(result.trackId)) rows.set(result.trackId, result)
        }
      } catch { /* 중간 종료로 깨진 마지막 줄은 무시한다. */ }
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  return rows
}

async function lookupMissingAppleRows(ids, appleRows) {
  let first = true
  for (const chunk of chunkByCount(ids, 100)) {
    if (!first) await sleep(APPLE_INTERVAL_MS)
    first = false
    const url = `https://itunes.apple.com/lookup?id=${chunk.join(',')}&country=US`
    const response = await fetch(url, { headers: { 'User-Agent': 'feelandnote-migration/1.0' } })
    if (response.status === 403 || response.status === 429) throw new Error(`iTunes 속도 제한(${response.status})`)
    if (!response.ok) throw new Error(`iTunes API 오류 ${response.status}`)
    const results = (await response.json()).results || []
    await appendFile(API_CACHE_PATH, `${JSON.stringify({ url, results })}\n`, 'utf8')
    for (const result of results) if (Number.isInteger(result.trackId)) appleRows.set(result.trackId, result)
  }
}

const [state, entities, previous, appleRows] = await Promise.all([
  readJson(STATE_PATH),
  readJson(ENTITY_PATH),
  readJson(EVIDENCE_PATH, { version: 1, items: {} }),
  loadAppleRows(),
])

const targets = Object.entries(state.items || {})
  .filter(([, item]) => (
    REVIEWABLE.has(item.status)
    && item.originalSpotifyEntity === 'track'
    && !item.aiReview?.action
  ))
  .sort(([left], [right]) => left.localeCompare(right))

const candidateIds = [...new Set(targets.flatMap(([, item]) => {
  const currentId = item.currentSourceAtScan === 'itunes'
    ? Number(String(item.currentExternalIdAtScan || '').replace(/^itunes[-_]/, ''))
    : null
  return [
    ...(item.candidates || []).filter((candidate) => candidate.entity === 'track').map((candidate) => candidate.id),
    ...(Number.isInteger(currentId) ? [currentId] : []),
  ]
}))]
const missingAppleIds = candidateIds.filter((id) => !appleRows.has(id))
await lookupMissingAppleRows(missingAppleIds, appleRows)

const evidence = { version: 1, generatedAt: new Date().toISOString(), items: { ...previous.items } }
for (const [index, [contentId, item]] of targets.entries()) {
  const entity = entities.items?.[contentId]
  const cachedDuration = evidence.items[contentId]?.spotify?.durationMs
  let durationMs = cachedDuration || null
  let evidenceError = null
  if (!durationMs && entity?.spotifyId) {
    try { durationMs = await spotifyDuration(entity.spotifyId) } catch (error) { evidenceError = error.message }
    if (index < targets.length - 1) await sleep(250)
  }
  const currentId = item.currentSourceAtScan === 'itunes'
    ? Number(String(item.currentExternalIdAtScan || '').replace(/^itunes[-_]/, ''))
    : null
  const currentApple = appleRows.get(currentId) || null
  evidence.items[contentId] = {
    contentId,
    status: item.status,
    currentSource: item.currentSourceAtScan,
    currentExternalId: item.currentExternalIdAtScan,
    identityTrusted: item.spotifyIdentityTrusted,
    spotify: {
      id: entity?.spotifyId || null,
      title: entity?.spotifyTitle || entity?.title || null,
      artists: entity?.spotifyArtists || [],
      releaseDate: entity?.spotifyReleaseDate || null,
      durationMs,
    },
    currentApple: currentApple && {
      id: currentApple.trackId,
      entity: currentApple.wrapperType === 'track' || currentApple.kind === 'song' ? 'track' : null,
      title: currentApple.trackName,
      artist: currentApple.artistName,
      releaseDate: (currentApple.releaseDate || '').slice(0, 10) || null,
      durationMs: Number(currentApple.trackTimeMillis) || null,
      collectionName: currentApple.collectionName || null,
      preview: Boolean(currentApple.previewUrl),
    },
    candidates: (item.candidates || []).filter((candidate) => candidate.entity === 'track').map((candidate) => {
      const apple = appleRows.get(candidate.id) || {}
      return {
        id: candidate.id,
        title: candidate.title,
        artist: candidate.artist,
        releaseDate: candidate.releaseDate,
        durationMs: Number(apple.trackTimeMillis) || null,
        collectionName: apple.collectionName || null,
        trackNumber: apple.trackNumber || null,
        collectionTrackCount: apple.trackCount || candidate.totalTracks || null,
        preview: Boolean(candidate.previewUrl),
        score: candidate.score || null,
      }
    }),
    error: evidenceError,
  }
  if ((index + 1) % 20 === 0) console.log(`트랙 증거 ${index + 1}/${targets.length}`)
}

for (const contentId of Object.keys(evidence.items)) {
  if (!targets.some(([targetId]) => targetId === contentId)) delete evidence.items[contentId]
}
await writeJsonAtomic(EVIDENCE_PATH, evidence)
console.log(JSON.stringify({ tracks: targets.length, appleCandidates: candidateIds.length, appleLookups: missingAppleIds.length, output: EVIDENCE_PATH }, null, 2))
