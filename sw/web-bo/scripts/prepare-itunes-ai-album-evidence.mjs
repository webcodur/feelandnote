/** AI 건별 검수를 위한 앨범 증거 묶음 생성. DB와 외부 API를 사용하지 않는다. */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const RUNTIME_DIR = resolve(process.cwd(), '../../.codex/runtime')
const STATE_PATH = resolve(RUNTIME_DIR, 'itunes-music-precision-state.json')
const ENTITY_PATH = resolve(RUNTIME_DIR, 'spotify-music-entity-cache.json')
const API_CACHE_PATH = resolve(RUNTIME_DIR, 'itunes-music-api-cache.jsonl')
const EVIDENCE_PATH = resolve(RUNTIME_DIR, 'itunes-music-ai-album-evidence.json')
const REVIEWABLE = new Set(['ambiguous', 'no_match', 'no_preview', 'ambiguous_entity', 'no_results'])

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

function normalizeAppleTracks(rows) {
  return rows
    .filter((row) => row.wrapperType === 'track' || row.kind === 'song')
    .sort((left, right) => (
      (Number(left.discNumber) || 1) - (Number(right.discNumber) || 1)
      || (Number(left.trackNumber) || 0) - (Number(right.trackNumber) || 0)
      || Number(left.trackId) - Number(right.trackId)
    ))
    .map((row) => ({
      title: row.trackName,
      durationMs: Number(row.trackTimeMillis) || null,
      trackNumber: Number(row.trackNumber) || null,
      discNumber: Number(row.discNumber) || 1,
    }))
}

function normalizeStateTracks(rows) {
  return (rows || []).map((row, index) => ({
    title: row.title,
    durationMs: Number(row.durationMs) || null,
    trackNumber: index + 1,
    discNumber: 1,
  }))
}

async function loadAlbumCache() {
  const albums = new Map()
  let text = ''
  try { text = await readFile(API_CACHE_PATH, 'utf8') } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    let payload
    try { payload = JSON.parse(line) } catch { continue }
    const grouped = new Map()
    for (const row of payload.results || []) {
      const collectionId = Number(row.collectionId)
      if (!Number.isInteger(collectionId)) continue
      const group = grouped.get(collectionId) || { collection: null, tracks: [] }
      if (row.wrapperType === 'collection') group.collection = row
      if (row.wrapperType === 'track' || row.kind === 'song') group.tracks.push(row)
      grouped.set(collectionId, group)
    }
    for (const [collectionId, group] of grouped) {
      const previous = albums.get(collectionId) || { collection: null, tracks: [] }
      albums.set(collectionId, {
        collection: group.collection || previous.collection,
        tracks: group.tracks.length > previous.tracks.length ? group.tracks : previous.tracks,
      })
    }
  }
  return albums
}

function albumEvidence(candidate, cached) {
  if (!candidate && !cached?.collection && !cached?.tracks?.length) return null
  const collection = cached?.collection || {}
  const cachedTracks = normalizeAppleTracks(cached?.tracks || [])
  const stateTracks = normalizeStateTracks(candidate?.appleTracks)
  const tracks = cachedTracks.length >= stateTracks.length ? cachedTracks : stateTracks
  const preview = candidate?.previewUrl || cached?.tracks?.find((row) => row.previewUrl)?.previewUrl || null
  return {
    id: Number(candidate?.id || collection.collectionId),
    entity: 'album',
    title: candidate?.title || collection.collectionName || null,
    artist: candidate?.artist || collection.artistName || null,
    releaseDate: candidate?.releaseDate || (collection.releaseDate || '').slice(0, 10) || null,
    totalTracks: Number(candidate?.totalTracks || collection.trackCount) || tracks.length || null,
    preview: Boolean(preview),
    country: candidate?.country || null,
    tracks,
    score: candidate?.score || null,
  }
}

const [state, entities, previous, albumCache] = await Promise.all([
  readJson(STATE_PATH),
  readJson(ENTITY_PATH),
  readJson(EVIDENCE_PATH, { version: 1, items: {} }),
  loadAlbumCache(),
])

const targets = Object.entries(state.items || {})
  .filter(([, item]) => (
    REVIEWABLE.has(item.status)
    && item.originalSpotifyEntity === 'album'
    && !item.aiReview?.action
  ))
  .sort(([left], [right]) => left.localeCompare(right))

const evidence = { version: 1, generatedAt: new Date().toISOString(), items: { ...previous.items } }
for (const [contentId, item] of targets) {
  const spotify = entities.items?.[contentId]
  const currentId = item.currentSourceAtScan === 'itunes'
    ? Number(String(item.currentExternalIdAtScan || '').replace(/^itunes[-_]/, ''))
    : null
  const currentState = currentId
    ? [item.currentValidation?.candidate, item.proposal, ...(item.candidates || [])]
      .find((candidate) => candidate?.entity === 'album' && candidate.id === currentId)
    : null
  evidence.items[contentId] = {
    contentId,
    status: item.status,
    currentSource: item.currentSourceAtScan,
    currentExternalId: item.currentExternalIdAtScan,
    identityTrusted: item.spotifyIdentityTrusted,
    spotify: {
      id: spotify?.spotifyId || null,
      title: spotify?.spotifyTitle || spotify?.title || null,
      artists: spotify?.spotifyArtists || [],
      releaseDate: spotify?.spotifyReleaseDate || null,
      totalTracks: spotify?.spotifyTracks?.length || null,
      tracks: spotify?.spotifyTracks || [],
    },
    currentApple: Number.isInteger(currentId)
      ? albumEvidence(currentState || { id: currentId }, albumCache.get(currentId))
      : null,
    candidates: (item.candidates || [])
      .filter((candidate) => candidate.entity === 'album')
      .map((candidate) => albumEvidence(candidate, albumCache.get(candidate.id))),
  }
}

for (const contentId of Object.keys(evidence.items)) {
  if (!targets.some(([targetId]) => targetId === contentId)) delete evidence.items[contentId]
}
await writeJsonAtomic(EVIDENCE_PATH, evidence)

const candidates = Object.values(evidence.items).flatMap((item) => item.candidates)
console.log(JSON.stringify({
  albums: targets.length,
  candidates: candidates.length,
  candidatesWithTracklists: candidates.filter((candidate) => candidate.tracks.length).length,
  currentAppleAlbums: Object.values(evidence.items).filter((item) => item.currentApple).length,
  output: EVIDENCE_PATH,
}, null, 2))
