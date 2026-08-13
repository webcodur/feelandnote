/**
 * 자동 검색 상위 25개 밖에 묻힌 트랙을 찾기 위한 AI 보조 증거 수집기다.
 * 공식 iTunes Search API의 결과 폭만 100개로 넓히며, 요청 간격은 3.5초를 유지한다.
 * DB와 정밀 이관 상태는 읽기만 하고 결과는 `.codex/runtime`에만 기록한다.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const args = process.argv.slice(2)
const queryPath = args.find((arg) => !arg.startsWith('--'))
if (!queryPath) {
  throw new Error('사용법: node scripts/prepare-itunes-ai-track-deep-evidence.mjs <queries.json>')
}

const RUNTIME_DIR = resolve(process.cwd(), '../../.codex/runtime')
const STATE_PATH = resolve(RUNTIME_DIR, 'itunes-music-precision-state.json')
const TRACK_EVIDENCE_PATH = resolve(RUNTIME_DIR, 'itunes-music-ai-track-evidence.json')
const OUTPUT_PATH = resolve(RUNTIME_DIR, 'itunes-music-ai-track-deep-evidence.json')
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

function normalizeTrack(result, context) {
  if (result.wrapperType !== 'track'
    || result.kind !== 'song'
    || !Number.isInteger(result.trackId)
    || !result.trackName
    || !result.artistName) return null
  return {
    id: result.trackId,
    entity: 'track',
    title: result.trackName,
    artist: result.artistName,
    previewUrl: result.previewUrl || null,
    itunesUrl: result.trackViewUrl || '',
    artwork: (result.artworkUrl100 || result.artworkUrl60 || '')
      .replace(/\/\d+x\d+bb\.(jpg|png)$/, '/600x600bb.$1') || null,
    releaseDate: (result.releaseDate || '').slice(0, 10) || null,
    genre: result.primaryGenreName || null,
    durationMs: Number(result.trackTimeMillis) || null,
    collectionId: Number(result.collectionId) || null,
    collectionName: result.collectionName || null,
    trackNumber: Number(result.trackNumber) || null,
    totalTracks: Number(result.trackCount) || 0,
    explicitness: result.trackExplicitness || null,
    country: context.country,
    query: context.term,
    rank: context.rank,
    evidenceSource: context.evidenceSource || 'itunes_search_100',
  }
}

const state = await readJson(STATE_PATH)
const trackEvidence = await readJson(TRACK_EVIDENCE_PATH)
const payload = await readJson(resolve(queryPath))
if (!state?.items || !trackEvidence?.items) throw new Error('AI 트랙 검수 상태 또는 증거가 없다')
if (!Array.isArray(payload?.queries) || !payload.queries.length) throw new Error('queries 배열이 비어 있다')

const output = await readJson(OUTPUT_PATH, {
  version: 1,
  providerLastRequestAt: null,
  items: {},
})
let nextRequestAt = output.providerLastRequestAt
  ? new Date(output.providerLastRequestAt).getTime() + REQUEST_INTERVAL_MS
  : 0
let requested = 0
let cached = 0

for (const [index, query] of payload.queries.entries()) {
  const contentId = query.contentId
  const term = String(query.term || '').trim()
  const lookupId = Number(query.lookupId) || null
  const country = String(query.country || 'US').toUpperCase()
  if (!state.items[contentId] || state.items[contentId].originalSpotifyEntity !== 'track') {
    throw new Error(`${contentId}: 트랙 상태가 없다`)
  }
  if (!trackEvidence.items[contentId]?.spotify?.id) throw new Error(`${contentId}: Spotify 트랙 증거가 없다`)
  if (!term && !Number.isInteger(lookupId)) throw new Error(`${contentId}: 검색어 또는 lookupId가 필요하다`)
  if (!/^[A-Z]{2}$/.test(country)) throw new Error(`${contentId}: country 형식이 잘못됐다`)

  const item = output.items[contentId] || {
    contentId,
    spotify: trackEvidence.items[contentId].spotify,
    searches: [],
  }
  const existing = item.searches.find((search) => (
    search.term === term && search.country === country && (search.lookupId || null) === lookupId
  ))
  if (existing) {
    cached++
    output.items[contentId] = item
    continue
  }

  let results = null
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    const waitMs = Math.max(0, nextRequestAt - Date.now())
    if (waitMs) await sleep(waitMs)
    nextRequestAt = Date.now() + REQUEST_INTERVAL_MS

    const params = lookupId
      ? new URLSearchParams({
        id: String(lookupId),
        country,
        ...(query.includeSongs ? { entity: 'song', limit: '200' } : {}),
      })
      : new URLSearchParams({ term, entity: 'song', limit: '100', country })
    const endpoint = lookupId ? 'lookup' : 'search'
    const response = await fetch(`https://itunes.apple.com/${endpoint}?${params}`, {
      headers: { 'User-Agent': 'feelandnote-migration/1.0' },
    })
    output.providerLastRequestAt = new Date().toISOString()
    if ((response.status === 403 || response.status === 429) && attempt < MAX_RATE_LIMIT_RETRIES) {
      await writeJsonAtomic(OUTPUT_PATH, output)
      console.log(`iTunes ${response.status}: 65초 냉각 후 재시도 (${contentId})`)
      await sleep(RATE_LIMIT_COOLDOWN_MS)
      continue
    }
    if (!response.ok) throw new Error(`iTunes Search ${response.status}: ${contentId}`)
    results = (await response.json()).results || []
    break
  }
  if (!results) throw new Error(`${contentId}: iTunes 검색 재시도 소진`)

  const candidates = results
    .map((result, rank) => normalizeTrack(result, {
      country,
      term: term || `lookup:${lookupId}`,
      rank,
      evidenceSource: lookupId ? 'itunes_lookup' : 'itunes_search_100',
    }))
    .filter(Boolean)
  item.searches.push({
    term,
    lookupId,
    includeSongs: Boolean(query.includeSongs),
    country,
    fetchedAt: new Date().toISOString(),
    candidates,
  })
  output.items[contentId] = item
  output.updatedAt = new Date().toISOString()
  requested++
  await writeJsonAtomic(OUTPUT_PATH, output)
  console.log(`확장 검색 ${index + 1}/${payload.queries.length}: ${contentId} → ${candidates.length}건`)
}

console.log(JSON.stringify({
  requested,
  cached,
  items: Object.keys(output.items).length,
  output: OUTPUT_PATH,
}, null, 2))
