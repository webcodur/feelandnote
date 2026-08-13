/**
 * AI가 지목한 Apple 앨범 ID를 공식 lookup으로 재확인한다.
 * 요청 간격은 3.5초를 유지하며 DB와 정밀 이관 상태는 변경하지 않는다.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const args = process.argv.slice(2)
const queryPath = args.find((arg) => !arg.startsWith('--'))
if (!queryPath) throw new Error('사용법: node scripts/prepare-itunes-ai-album-deep-evidence.mjs <queries.json>')

const RUNTIME_DIR = resolve(process.cwd(), '../../.codex/runtime')
const STATE_PATH = resolve(RUNTIME_DIR, 'itunes-music-precision-state.json')
const ALBUM_EVIDENCE_PATH = resolve(RUNTIME_DIR, 'itunes-music-ai-album-evidence.json')
const OUTPUT_PATH = resolve(RUNTIME_DIR, 'itunes-music-ai-album-deep-evidence.json')
const REQUEST_INTERVAL_MS = 3500
const RATE_LIMIT_COOLDOWN_MS = 65000
const MAX_RATE_LIMIT_RETRIES = 2

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms))

async function readJson(path, fallback = null) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch (error) {
    if (error?.code === 'ENOENT') return fallback
    throw error
  }
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true })
  const tempPath = `${path}.next`
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(tempPath, path)
}

function normalizeAlbum(results, lookupId, context) {
  const collection = results.find((result) => (
    result.wrapperType === 'collection' && result.collectionId === lookupId
  ))
  if (!collection?.collectionName || !collection.artistName) return null
  const tracks = results
    .filter((result) => (
      (result.wrapperType === 'track' || result.kind === 'song')
      && result.collectionId === lookupId
    ))
    .sort((left, right) => (
      (Number(left.discNumber) || 1) - (Number(right.discNumber) || 1)
      || (Number(left.trackNumber) || 0) - (Number(right.trackNumber) || 0)
    ))
  const previewUrl = tracks.find((track) => track.previewUrl)?.previewUrl || null
  return {
    id: collection.collectionId,
    entity: 'album',
    title: collection.collectionName,
    artist: collection.artistName,
    previewUrl,
    itunesUrl: collection.collectionViewUrl || '',
    artwork: (collection.artworkUrl100 || collection.artworkUrl60 || '')
      .replace(/\/\d+x\d+bb\.(jpg|png)$/, '/600x600bb.$1') || null,
    releaseDate: (collection.releaseDate || '').slice(0, 10) || null,
    genre: collection.primaryGenreName || null,
    // collection.trackCount occasionally includes a non-song asset (for example,
    // a digital booklet). The migration stores playable song count, so prefer the
    // tracks returned by the song lookup whenever they are available.
    totalTracks: tracks.length || Number(collection.trackCount) || 0,
    country: context.country,
    query: `lookup:${lookupId}`,
    rank: 0,
    appleTracks: tracks.map((track) => ({
      title: track.trackName,
      durationMs: Number(track.trackTimeMillis) || null,
    })),
    albumChecked: true,
    evidenceSource: 'itunes_lookup',
  }
}

const state = await readJson(STATE_PATH)
const albumEvidence = await readJson(ALBUM_EVIDENCE_PATH)
const payload = await readJson(resolve(queryPath))
if (!state?.items || !albumEvidence?.items) throw new Error('AI 앨범 검수 상태 또는 증거가 없다')
if (!Array.isArray(payload?.queries) || !payload.queries.length) throw new Error('queries 배열이 비어 있다')

const output = await readJson(OUTPUT_PATH, { version: 1, providerLastRequestAt: null, items: {} })
let nextRequestAt = output.providerLastRequestAt
  ? new Date(output.providerLastRequestAt).getTime() + REQUEST_INTERVAL_MS
  : 0
let requested = 0
let cached = 0

for (const [index, query] of payload.queries.entries()) {
  const contentId = query.contentId
  const lookupId = Number(query.lookupId)
  const country = String(query.country || 'US').toUpperCase()
  if (!state.items[contentId] || state.items[contentId].originalSpotifyEntity !== 'album') {
    throw new Error(`${contentId}: 앨범 상태가 없다`)
  }
  if (!albumEvidence.items[contentId]?.spotify?.id) throw new Error(`${contentId}: Spotify 앨범 증거가 없다`)
  if (!Number.isInteger(lookupId)) throw new Error(`${contentId}: lookupId가 필요하다`)
  if (!/^[A-Z]{2}$/.test(country)) throw new Error(`${contentId}: country 형식이 잘못됐다`)

  const item = output.items[contentId] || {
    contentId,
    spotify: albumEvidence.items[contentId].spotify,
    searches: [],
  }
  const existing = item.searches.find((search) => (
    search.lookupId === lookupId && search.country === country
  ))
  if (existing) {
    for (const candidate of existing.candidates || []) {
      if (candidate.appleTracks?.length) candidate.totalTracks = candidate.appleTracks.length
    }
    cached++
    output.items[contentId] = item
    continue
  }

  let results = null
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    const waitMs = Math.max(0, nextRequestAt - Date.now())
    if (waitMs) await sleep(waitMs)
    nextRequestAt = Date.now() + REQUEST_INTERVAL_MS
    const params = new URLSearchParams({ id: String(lookupId), entity: 'song', country, limit: '200' })
    const response = await fetch(`https://itunes.apple.com/lookup?${params}`, {
      headers: { 'User-Agent': 'feelandnote-migration/1.0' },
    })
    output.providerLastRequestAt = new Date().toISOString()
    if ((response.status === 403 || response.status === 429) && attempt < MAX_RATE_LIMIT_RETRIES) {
      await writeJsonAtomic(OUTPUT_PATH, output)
      console.log(`iTunes ${response.status}: 65초 냉각 후 재시도 (${contentId})`)
      await sleep(RATE_LIMIT_COOLDOWN_MS)
      continue
    }
    if (!response.ok) throw new Error(`iTunes lookup ${response.status}: ${contentId}`)
    results = (await response.json()).results || []
    break
  }
  if (!results) throw new Error(`${contentId}: iTunes lookup 재시도 소진`)

  const candidate = normalizeAlbum(results, lookupId, { country })
  item.searches.push({
    lookupId,
    country,
    fetchedAt: new Date().toISOString(),
    candidates: candidate ? [candidate] : [],
  })
  output.items[contentId] = item
  output.updatedAt = new Date().toISOString()
  requested++
  await writeJsonAtomic(OUTPUT_PATH, output)
  console.log(`앨범 ID 재확인 ${index + 1}/${payload.queries.length}: ${contentId} → ${candidate ? 1 : 0}건`)
}

if (cached) {
  output.updatedAt = new Date().toISOString()
  await writeJsonAtomic(OUTPUT_PATH, output)
}

console.log(JSON.stringify({ requested, cached, items: Object.keys(output.items).length, output: OUTPUT_PATH }, null, 2))
