/**
 * Spotify → iTunes 정밀 이전 2차 패스.
 *
 * 1) `--scan`: Spotify oEmbed 분류 캐시를 바탕으로 track/album을 나눠 검색하고
 *    확정 후보와 보류 원인을 `.codex/runtime`에 저장한다. DB는 수정하지 않는다.
 * 2) `--apply`: 확정 후보를 재조회한 뒤 DB에 반영한다. (스캔 검수 후 구현·실행)
 *
 * Apple Search API의 약 분당 20회 제한보다 느린 단일 요청열만 사용한다.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { appendFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { chunkByCount, packByWeight, uniqueBy } from './lib/itunes-batch.mjs'
import { validateAiReviewCandidate } from './lib/itunes-ai-review.mjs'

dotenv.config({ path: resolve(process.cwd(), '.env'), quiet: true })

const args = process.argv.slice(2)
const MODE = args.includes('--apply') ? 'apply' : 'scan'
const CONTINUOUS = args.includes('--continuous')
const AUTO = args.includes('--auto')
if (MODE === 'apply' && CONTINUOUS) throw new Error('--continuous는 스캔에서만 쓸 수 있다')
if (MODE === 'apply' && AUTO) throw new Error('--auto와 --apply는 함께 쓸 수 없다')
const limitIndex = args.indexOf('--limit')
const LIMIT = limitIndex >= 0 ? Number(args[limitIndex + 1]) : Number.POSITIVE_INFINITY
if (!(LIMIT === Number.POSITIVE_INFINITY || (Number.isInteger(LIMIT) && LIMIT > 0))) {
  throw new Error('--limit은 1 이상의 정수여야 한다')
}
const afterIndex = args.indexOf('--after')
const AFTER = afterIndex >= 0 ? args[afterIndex + 1] : null
if (AFTER && !/^[0-9a-f-]{36}$/i.test(AFTER)) throw new Error('--after는 contents.id UUID여야 한다')
if (CONTINUOUS && AFTER) throw new Error('--continuous는 --after 없이 전체 상태를 재개한다')
if (AUTO && AFTER) throw new Error('--auto는 --after 없이 전체 상태를 재개한다')

const RUNTIME_DIR = resolve(process.cwd(), '../../.codex/runtime')
const ENTITY_CACHE_PATH = resolve(RUNTIME_DIR, 'spotify-music-entity-cache.json')
const ENTITY_STATE_PATH = resolve(RUNTIME_DIR, 'spotify-music-entity-state.json')
const PRECISION_STATE_PATH = resolve(RUNTIME_DIR, 'itunes-music-precision-state.json')
const API_CACHE_PATH = resolve(RUNTIME_DIR, 'itunes-music-api-cache.jsonl')
const REQUEST_INTERVAL_MS = 3500
const RATE_LIMIT_COOLDOWN_MS = 65000
const MAX_RATE_LIMIT_RETRIES = 2

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms))

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

async function readJson(path, fallback = null) {
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

const fold = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^\p{L}\p{N}]+/gu, '')

const words = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .match(/[\p{L}\p{N}]+/gu) || []

const VERSION_TERMS = [
  'live', 'remix', 'acoustic', 'instrumental', 'demo', 'mono', 'stereo',
  'edit', 'version', 'deluxe', 'remaster', 'remastered', 'soundtrack',
]

function baseTitle(value) {
  return String(value || '')
    .replace(/[([{]\s*[^\])}]*\b(?:live|remix|acoustic|instrumental|demo|mono|stereo|edit|version|deluxe|remaster(?:ed)?|soundtrack)\b[^\])}]*[\])}]/gi, ' ')
    .replace(/\b(?:19|20)\d{2}\s+remaster(?:ed)?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function qualifiers(value) {
  const normalized = words(value)
  return new Set(VERSION_TERMS.filter((term) => normalized.includes(term)))
}

function levenshteinRatio(left, right) {
  if (left === right) return 1
  if (!left || !right) return 0
  const a = [...left].slice(0, 180)
  const b = [...right].slice(0, 180)
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    previous = current
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length)
}

function tokenDice(left, right) {
  const a = new Set(words(left))
  const b = new Set(words(right))
  if (!a.size || !b.size) return 0
  let overlap = 0
  for (const token of a) if (b.has(token)) overlap++
  return (2 * overlap) / (a.size + b.size)
}

function similarity(left, right) {
  const a = fold(left)
  const b = fold(right)
  if (!a || !b) return 0
  if (a === b) return 1
  const containment = a.includes(b) || b.includes(a)
    ? Math.min(a.length, b.length) / Math.max(a.length, b.length)
    : 0
  return Math.max(levenshteinRatio(a, b), tokenDice(left, right), containment)
}

function titleScore(aliases, candidate) {
  let best = 0
  for (const alias of aliases) {
    best = Math.max(
      best,
      similarity(alias, candidate),
      similarity(baseTitle(alias), baseTitle(candidate)) * 0.98
    )
  }
  return Math.min(best, 1)
}

function creatorParts(value) {
  return [String(value || ''), ...String(value || '').split(/\s*[·•,&/;]\s*|\s+(?:and|feat\.?|featuring|with)\s+/i)]
    .map((part) => part.trim())
    .filter(Boolean)
}

function artistScore(aliases, candidate) {
  let best = 0
  const candidateParts = creatorParts(candidate)
  for (const alias of aliases.flatMap(creatorParts)) {
    for (const part of candidateParts) best = Math.max(best, similarity(alias, part))
  }
  return best
}

function versionPenalty(titleAliases, candidateTitle) {
  const source = new Set(titleAliases.flatMap((title) => [...qualifiers(title)]))
  const candidate = qualifiers(candidateTitle)
  let penalty = 0
  for (const term of source) if (!candidate.has(term)) penalty += ['deluxe', 'remaster', 'remastered'].includes(term) ? 0.02 : 0.08
  for (const term of candidate) if (!source.has(term)) penalty += ['deluxe', 'remaster', 'remastered'].includes(term) ? 0.01 : 0.08
  return Math.min(penalty, 0.2)
}

function durationScore(left, right) {
  const a = Number(left) || 0
  const b = Number(right) || 0
  if (!a || !b) return 0.5
  const delta = Math.abs(a - b)
  if (delta <= 3000) return 1
  if (delta <= 10000) return 0.9
  if (delta <= 30000) return 0.6
  if (delta <= 60000) return 0.3
  return 0
}

function albumTracklistScore(spotifyTracks, appleTracks) {
  if (!spotifyTracks?.length || !appleTracks?.length) return null
  const compared = Math.min(spotifyTracks.length, appleTracks.length)
  let total = 0
  for (let index = 0; index < compared; index++) {
    const spotifyTrack = spotifyTracks[index]
    const appleTrack = appleTracks[index]
    const title = titleScore([spotifyTrack.title], appleTrack.title)
    const duration = durationScore(spotifyTrack.durationMs, appleTrack.durationMs)
    total += title * 0.55 + duration * 0.45
  }
  const coverage = compared / Math.max(spotifyTracks.length, appleTracks.length)
  return (total / compared) * (0.65 + coverage * 0.35)
}

function candidateScore(source, candidate, appleTracks = candidate.appleTracks) {
  const aliasTitle = titleScore(source.titleAliases, candidate.title)
  const aliasArtist = artistScore(source.creatorAliases, candidate.artist)
  const officialTitle = source.officialTitle
    ? titleScore([source.officialTitle], candidate.title)
    : null
  const officialArtist = source.officialCreators?.length
    ? artistScore(source.officialCreators, candidate.artist)
    : null
  const title = officialTitle === null ? aliasTitle : aliasTitle * 0.35 + officialTitle * 0.65
  const artist = officialArtist === null ? aliasArtist : aliasArtist * 0.4 + officialArtist * 0.6
  const tracklist = candidate.entity === 'album'
    ? albumTracklistScore(source.spotifyTracks, appleTracks)
    : null
  const trackCount = candidate.entity === 'album' && source.spotifyTracks?.length && candidate.totalTracks
    ? Math.min(source.spotifyTracks.length, candidate.totalTracks) / Math.max(source.spotifyTracks.length, candidate.totalTracks)
    : null
  const penalty = versionPenalty(source.titleAliases, candidate.title)
  const total = tracklist === null
    ? trackCount === null
      ? title * 0.72 + artist * 0.28 - penalty
      : title * 0.62 + artist * 0.23 + trackCount * 0.15 - penalty
    : title * 0.4 + artist * 0.15 + tracklist * 0.45 - penalty
  return {
    title,
    artist,
    aliasTitle,
    aliasArtist,
    officialTitle,
    officialArtist,
    tracklist,
    trackCount,
    penalty,
    total: Math.max(0, Math.min(1, total)),
  }
}

function scoringSource(aliases, entityInfo) {
  return {
    titleAliases: aliases.titleAliases,
    creatorAliases: aliases.creatorAliases,
    officialTitle: entityInfo?.spotifyTitle || null,
    officialCreators: entityInfo?.spotifyArtists || [],
    spotifyTracks: entityInfo?.spotifyTracks || null,
  }
}

function sourceAliases(row, entityInfo) {
  const locales = row.content_locales || []
  const titleAliases = [...new Set([
    ...locales.map((locale) => locale.title),
    entityInfo?.spotifyTitle,
    entityInfo?.title,
  ].filter(Boolean))]
  const creatorAliases = [...new Set(locales.map((locale) => locale.creator).filter(Boolean))]
  const en = locales.find((locale) => locale.locale === 'en') || locales[0]
  const ko = locales.find((locale) => locale.locale === 'ko')
  return { titleAliases, creatorAliases, en, ko }
}

function spotifyIdentity(row, entityInfo) {
  if (!entityInfo || entityInfo.entity === 'unknown') {
    return { trusted: false, title: 0, artist: 0 }
  }
  const locales = row.content_locales || []
  const titleAliases = locales.map((locale) => locale.title).filter(Boolean)
  const creatorAliases = locales.map((locale) => locale.creator).filter(Boolean)
  const spotifyTitle = entityInfo.spotifyTitle || entityInfo.title || ''
  const spotifyArtists = entityInfo.spotifyArtists || []
  const title = spotifyTitle ? titleScore(titleAliases, spotifyTitle) : 0
  const artist = spotifyArtists.length ? artistScore(creatorAliases, spotifyArtists.join(' · ')) : 0
  // 제목이 같아도 전혀 다른 아티스트의 곡일 수 있다. 공식 아티스트가 있으면
  // 제목 단독 일치로는 원래 Spotify ID를 신뢰하지 않는다.
  const trusted = spotifyArtists.length > 0 && title >= 0.78 && artist >= 0.55
  return { trusted, title, artist }
}

function storedMetadataEntity(row) {
  const hint = String(row.metadata?.entityType || row.metadata?.albumType || '').toLowerCase()
  return hint === 'album' ? 'album' : 'track'
}

function metadataEntity(row, entityCache) {
  const cached = entityCache.items?.[row.id]
  const current = storedMetadataEntity(row)
  const identity = spotifyIdentity(row, cached)
  if (identity.trusted && cached.entity !== current) return 'mismatch'
  return current
}

function exactKey(title, creator) {
  return `${fold(title)}|${fold(creator)}`
}

function buildExactIndex(itunesRows, entityCache) {
  const index = new Map()
  for (const row of itunesRows) {
    // 이번 이전에서 만든 행은 Apple 단건 재검증이 끝나기 전까지 정본으로 쓰지 않는다.
    if (entityCache.items?.[row.id] || !row.metadata?.previewUrl) continue
    const entity = metadataEntity(row, entityCache)
    if (entity === 'mismatch') continue
    for (const locale of row.content_locales || []) {
      const key = `${entity}|${exactKey(locale.title, locale.creator)}`
      if (key.endsWith('|')) continue
      const rows = index.get(key) || []
      if (!rows.some((item) => item.id === row.id)) rows.push(row)
      index.set(key, rows)
    }
  }
  return index
}

function exactCanonical(row, entity, exactIndex) {
  const matches = new Map()
  for (const locale of row.content_locales || []) {
    const key = `${entity}|${exactKey(locale.title, locale.creator)}`
    for (const match of exactIndex.get(key) || []) {
      if (match.id !== row.id) matches.set(match.id, match)
    }
  }
  return matches.size === 1 ? [...matches.values()][0] : null
}

let nextProviderRequestAt = 0
let requestCount = 0
let cooldownCount = 0
let cacheHitCount = 0
let apiCacheLoaded = false
const apiCache = new Map()
let counterBase = null

function counterSnapshot(state) {
  if (!counterBase) {
    counterBase = {
      requests: Number(state?.requestCount) || 0,
      cooldowns: Number(state?.cooldownCount) || 0,
      cacheHits: Number(state?.cacheHitCount) || 0,
    }
  }
  return {
    requestCount: counterBase.requests + requestCount,
    cooldownCount: counterBase.cooldowns + cooldownCount,
    cacheHitCount: counterBase.cacheHits + cacheHitCount,
  }
}

function assignCounters(state) {
  Object.assign(state, counterSnapshot(state))
}

async function loadApiCache() {
  if (apiCacheLoaded) return
  apiCacheLoaded = true
  try {
    const lines = (await readFile(API_CACHE_PATH, 'utf8')).split(/\r?\n/).filter(Boolean)
    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        if (typeof entry.url === 'string' && Array.isArray(entry.results)) apiCache.set(entry.url, entry.results)
      } catch { /* 중간 종료로 깨진 마지막 줄은 다음 실행에서 무시한다. */ }
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

async function cacheApiResults(url, results) {
  apiCache.set(url, results)
  await mkdir(dirname(API_CACHE_PATH), { recursive: true })
  await appendFile(API_CACHE_PATH, `${JSON.stringify({ url, results })}\n`, 'utf8')
}

async function waitForProviderSlot() {
  const waitMs = Math.max(0, nextProviderRequestAt - Date.now())
  if (waitMs) await sleep(waitMs)
  nextProviderRequestAt = Date.now() + REQUEST_INTERVAL_MS
}

async function itunesRequest(url) {
  await loadApiCache()
  const cached = apiCache.get(url)
  if (cached) {
    cacheHitCount++
    return cached
  }
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    await waitForProviderSlot()
    requestCount++
    let response
    try {
      response = await fetch(url, { headers: { 'User-Agent': 'feelandnote-migration/1.0' } })
    } catch (error) {
      if (attempt < MAX_RATE_LIMIT_RETRIES) {
        nextProviderRequestAt = Date.now() + 5000 * (attempt + 1)
        continue
      }
      throw new Error(`아이튠즈 네트워크 오류: ${error instanceof Error ? error.message : String(error)}`)
    }
    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const retryAfter = Number(response.headers.get('retry-after'))
      const cooldown = Math.max(
        Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter * 1000 : 0,
        RATE_LIMIT_COOLDOWN_MS * (attempt + 1)
      )
      cooldownCount++
      nextProviderRequestAt = Date.now() + cooldown
      continue
    }
    if (response.status >= 500 && attempt < MAX_RATE_LIMIT_RETRIES) {
      nextProviderRequestAt = Date.now() + 5000 * (attempt + 1)
      continue
    }
    if (response.status === 403 || response.status === 429) throw new Error(`아이튠즈 속도 제한(${response.status})`)
    if (!response.ok) throw new Error(`아이튠즈 API 오류 ${response.status}`)
    const results = (await response.json()).results || []
    await cacheApiResults(url, results)
    return results
  }
  throw new Error('아이튠즈 재시도 상태가 올바르지 않다')
}

async function search(term, entity, country) {
  const params = new URLSearchParams({
    term,
    entity: entity === 'album' ? 'album' : 'song',
    limit: entity === 'album' ? '50' : '25',
    country,
  })
  return itunesRequest(`https://itunes.apple.com/search?${params}`)
}

function toCandidate(result, entity, context) {
  const id = entity === 'album' ? result.collectionId : result.trackId
  const title = entity === 'album' ? result.collectionName : result.trackName
  if (!Number.isInteger(id) || !title || !result.artistName) return null
  const artwork = (result.artworkUrl100 || result.artworkUrl60 || '')
    .replace(/\/\d+x\d+bb\.(jpg|png)$/, '/600x600bb.$1') || null
  return {
    id,
    entity,
    title,
    artist: result.artistName,
    previewUrl: entity === 'track' ? result.previewUrl || null : null,
    itunesUrl: entity === 'album' ? result.collectionViewUrl || '' : result.trackViewUrl || '',
    artwork,
    releaseDate: (result.releaseDate || '').slice(0, 10) || null,
    genre: result.primaryGenreName || null,
    totalTracks: result.trackCount || 0,
    durationMs: entity === 'track' ? Number(result.trackTimeMillis) || 0 : null,
    collectionName: entity === 'track' ? result.collectionName || null : null,
    country: context.country,
    query: context.query,
    rank: context.rank,
  }
}

function rankedCandidates(source, results, entity, context, collected) {
  for (const [rank, result] of results.entries()) {
    const candidate = toCandidate(result, entity, { ...context, rank })
    if (!candidate) continue
    const score = candidateScore(source, candidate)
    const previous = collected.get(candidate.id)
    if (!previous || (!previous.albumChecked && score.total > previous.score.total)) {
      collected.set(candidate.id, { ...candidate, score })
    }
  }
  return [...collected.values()].sort((left, right) => right.score.total - left.score.total || left.rank - right.rank)
}

function appleTrackSignature(results, collectionId) {
  return results
    .filter((result) => result.wrapperType === 'track' && result.collectionId === collectionId && result.trackName)
    .sort((left, right) => (
      (left.discNumber || 0) - (right.discNumber || 0)
      || (left.trackNumber || 0) - (right.trackNumber || 0)
    ))
    .map((result) => ({
      title: result.trackName,
      durationMs: Number(result.trackTimeMillis) || 0,
    }))
}

function albumCandidateFromResults(candidate, source, results) {
  const collection = results.find((result) => (
    result.wrapperType === 'collection' && result.collectionId === candidate.id
  ))
  if (!collection) return { ...candidate, albumChecked: true }
  const previewTrack = results.find((result) => result.collectionId === candidate.id && result.previewUrl)
  const checked = toCandidate(collection, 'album', {
    country: candidate.country || 'US',
    query: candidate.query || '',
    rank: candidate.rank || 0,
  })
  if (!checked) return { ...candidate, albumChecked: true }
  checked.previewUrl = previewTrack?.previewUrl || null
  checked.appleTracks = appleTrackSignature(results, candidate.id)
  // Apple collection.trackCount can include a non-song asset. Keep the metadata
  // aligned with the playable song list that was actually verified.
  checked.totalTracks = checked.appleTracks.length || checked.totalTracks
  checked.albumChecked = true
  checked.score = candidateScore(source, checked)
  return checked
}

async function lookupAlbumCandidate(candidate, source) {
  const results = await itunesRequest(
    `https://itunes.apple.com/lookup?id=${candidate.id}&entity=song&country=${candidate.country || 'US'}&limit=200`
  )
  return albumCandidateFromResults(candidate, source, results)
}

async function lookupAlbumCandidates(candidates, source) {
  const checked = new Map()
  const countries = new Map()
  for (const candidate of uniqueBy(candidates, (item) => `${item.country || 'US'}:${item.id}`)) {
    const country = candidate.country || 'US'
    const items = countries.get(country) || []
    items.push(candidate)
    countries.set(country, items)
  }
  for (const [country, items] of countries) {
    const packs = packByWeight(items, {
      maxItems: 20,
      maxWeight: 180,
      weightOf: (candidate) => Math.max(2, (candidate.totalTracks || 25) + 1),
    })
    for (const pack of packs) {
      const ids = pack.map((candidate) => candidate.id).join(',')
      const results = await itunesRequest(
        `https://itunes.apple.com/lookup?id=${ids}&entity=song&country=${country}&limit=200`
      )
      for (const candidate of pack) {
        checked.set(candidate.id, albumCandidateFromResults(candidate, source, results))
      }
    }
  }
  return checked
}

async function enrichAlbumCandidates(ranked, source, collected, lookedUp) {
  const pending = []
  for (const candidate of ranked.filter((item) => item.score.title >= 0.7).slice(0, 6)) {
    if (lookedUp.has(candidate.id) || lookedUp.size >= 12) continue
    lookedUp.add(candidate.id)
    pending.push(candidate)
  }
  const checked = await lookupAlbumCandidates(pending, source)
  for (const [id, candidate] of checked) {
    collected.set(id, candidate)
  }
  return [...collected.values()].sort((left, right) => right.score.total - left.score.total || left.rank - right.rank)
}

function confident(ranked, entity) {
  const playable = ranked.filter((item) => item.previewUrl)
  const top = playable[0]
  if (!top) return null
  const second = playable[1]
  const margin = top.score.total - (second?.score.total || 0)
  const exact = top.score.title >= 0.995 && top.score.artist >= 0.85
  const threshold = entity === 'album' ? 0.87 : 0.89
  const titleThreshold = entity === 'album' ? 0.86 : 0.89
  const artistThreshold = entity === 'album' ? 0.5 : 0.62
  const fingerprintStrong = entity === 'album' && top.score.tracklist >= 0.86
  if (fingerprintStrong) {
    if (top.score.total < 0.8 || top.score.title < 0.8) return null
    if (top.score.officialTitle !== null && top.score.officialTitle < 0.75) return null
    if (!exact && margin < 0.035) return null
    return { ...top, margin }
  }
  if (top.score.total < threshold || top.score.title < titleThreshold || top.score.artist < artistThreshold) return null
  if (top.score.officialTitle !== null && top.score.officialTitle < 0.78) return null
  if (top.score.officialArtist !== null && top.score.officialArtist < 0.55) return null
  if (!exact && margin < 0.035) return null
  return { ...top, margin }
}

function primaryCreator(value) {
  return String(value || '').split(/\s*[·•]\s*/)[0].trim()
}

async function scanExternal(row, entityInfo) {
  const aliases = sourceAliases(row, entityInfo)
  const source = scoringSource(aliases, entityInfo)
  const enTitle = aliases.en?.title || aliases.titleAliases[0]
  const enCreator = primaryCreator(aliases.en?.creator || aliases.creatorAliases[0])
  const koTitle = aliases.ko?.title
  const koCreator = primaryCreator(aliases.ko?.creator)
  const strategies = []
  const add = (country, query) => {
    const value = String(query || '').trim()
    if (value && !strategies.some((item) => item.country === country && item.query === value)) strategies.push({ country, query: value })
  }
  const officialTitle = entityInfo.spotifyTitle || null
  const officialCreator = primaryCreator(entityInfo.spotifyArtists?.[0])
  add('US', officialTitle && `${officialTitle} ${officialCreator}`)
  add('US', `${enTitle} ${enCreator}`)
  if (/[ぁ-んァ-ヶ一-龠]/u.test(`${enTitle} ${enCreator}`)) {
    add('JP', `${enTitle} ${enCreator}`)
  } else if (koTitle && fold(koTitle) !== fold(enTitle)) {
    add('KR', `${koTitle} ${koCreator || enCreator}`)
  }

  const collected = new Map()
  const lookedUpAlbums = new Set()
  let ranked = []
  for (const strategy of strategies) {
    const results = await search(strategy.query, entityInfo.entity, strategy.country)
    ranked = rankedCandidates(source, results, entityInfo.entity, strategy, collected)
    if (entityInfo.entity === 'album') {
      ranked = await enrichAlbumCandidates(ranked, source, collected, lookedUpAlbums)
    }
    const match = confident(ranked, entityInfo.entity)
    if (match && (match.score.title >= 0.995 || match.margin >= 0.08)) {
      return { status: 'matched', proposal: match, candidates: ranked.slice(0, 5), aliases }
    }
  }

  if (ranked.length === 0) {
    const fallbackQuery = officialTitle || enTitle || koTitle
    if (fallbackQuery) {
      const fallbackCountry = /[ぁ-んァ-ヶ一-龠]/u.test(fallbackQuery) ? 'JP' : 'US'
      const results = await search(fallbackQuery, entityInfo.entity, fallbackCountry)
      ranked = rankedCandidates(source, results, entityInfo.entity, {
        country: fallbackCountry,
        query: fallbackQuery,
      }, collected)
      if (entityInfo.entity === 'album') {
        ranked = await enrichAlbumCandidates(ranked, source, collected, lookedUpAlbums)
      }
    }
  }

  const match = confident(ranked, entityInfo.entity)
  if (match) return { status: 'matched', proposal: match, candidates: ranked.slice(0, 5), aliases }
  const best = ranked[0]
  if (best?.score.total >= 0.87 && !best.previewUrl) {
    return { status: 'no_preview', candidates: ranked.slice(0, 5), aliases }
  }
  if (best?.score.total >= 0.72) return { status: 'ambiguous', candidates: ranked.slice(0, 5), aliases }
  return { status: ranked.length ? 'no_match' : 'no_results', candidates: ranked.slice(0, 5), aliases }
}

async function scanEntities(row, entityInfo, identity, exactIndex) {
  const entities = identity.trusted ? [entityInfo.entity] : ['track', 'album']
  const canonicalMatches = entities
    .map((entity) => ({ entity, target: exactCanonical(row, entity, exactIndex) }))
    .filter((entry) => entry.target)
  if (canonicalMatches.length === 1) {
    const { entity, target } = canonicalMatches[0]
    return {
      status: 'matched',
      sourceEntity: entity,
      matchType: 'existing_exact',
      proposal: {
        entity,
        targetContentId: target.id,
        id: Number(String(target.external_id || '').replace(/^itunes[-_]/, '')),
        externalId: target.external_id,
        score: { title: 1, artist: 1, penalty: 0, total: 1 },
        margin: 1,
      },
    }
  }
  if (canonicalMatches.length > 1) {
    return {
      status: 'ambiguous_entity',
      sourceEntity: null,
      matchType: 'existing_exact',
      candidates: canonicalMatches.map(({ entity, target }) => ({
        entity,
        targetContentId: target.id,
        externalId: target.external_id,
      })),
    }
  }

  const variants = []
  for (const entity of entities) {
    const scopedInfo = {
      ...entityInfo,
      entity,
      spotifyTitle: identity.trusted ? entityInfo.spotifyTitle : null,
      title: identity.trusted ? entityInfo.title : null,
      spotifyArtists: identity.trusted ? entityInfo.spotifyArtists : [],
      spotifyTracks: identity.trusted ? entityInfo.spotifyTracks : null,
    }
    variants.push({ entity, result: await scanExternal(row, scopedInfo) })
  }
  const matches = variants.filter((variant) => variant.result.status === 'matched')
    .sort((left, right) => right.result.proposal.score.total - left.result.proposal.score.total)
  if (matches.length === 1) {
    return { sourceEntity: matches[0].entity, matchType: 'itunes_search', ...matches[0].result }
  }
  if (matches.length > 1) {
    const [top, second] = matches
    if (top.result.proposal.score.total - second.result.proposal.score.total >= 0.06) {
      return { sourceEntity: top.entity, matchType: 'itunes_search', ...top.result }
    }
    return {
      status: 'ambiguous_entity',
      sourceEntity: null,
      matchType: 'itunes_search',
      candidates: matches.map((variant) => ({ entity: variant.entity, ...variant.result.proposal })),
    }
  }

  const priority = ['no_preview', 'ambiguous', 'no_match', 'no_results']
  const status = priority.find((candidate) => variants.some((variant) => variant.result.status === candidate)) || 'no_match'
  return {
    status,
    sourceEntity: identity.trusted ? entityInfo.entity : null,
    matchType: 'itunes_search',
    candidates: variants.flatMap((variant) => (
      variant.result.candidates || []
    ).map((candidate) => ({ ...candidate, entity: variant.entity }))).slice(0, 10),
  }
}

function summarize(items) {
  const summary = {}
  for (const item of Object.values(items || {})) summary[item.status] = (summary[item.status] || 0) + 1
  return summary
}

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value)
const asObject = (value) => isObject(value) ? value : {}
const hasSpotifyValue = (value) => /spotify\.com|scdn\.co/i.test(JSON.stringify(value ?? ''))

function withoutSpotifyMetadata(metadata) {
  const cleaned = { ...asObject(metadata) }
  for (const key of Object.keys(cleaned)) if (/spotify/i.test(key)) delete cleaned[key]
  return cleaned
}

function cleanedItunesSources(value, { artwork, itunesUrl }) {
  const source = { ...asObject(value) }
  for (const key of Object.keys(source)) {
    if (/spotify/i.test(key) || hasSpotifyValue(source[key])) delete source[key]
  }
  source.primary = 'itunes'
  if (itunesUrl) source.url = itunesUrl
  else delete source.url
  if (artwork) source.thumbnail = 'itunes'
  else delete source.thumbnail
  return source
}

async function selectByContentId(table, select, contentId) {
  const { data, error } = await sb.from(table).select(select).eq('content_id', contentId)
  if (error) throw new Error(`${table} 참조 조회 실패: ${error.message}`)
  return data || []
}

async function updateRowsContentId(table, rows, targetContentId) {
  if (!rows.length) return
  const ids = rows.map((row) => row.id)
  const { data, error } = await sb.from(table)
    .update({ content_id: targetContentId })
    .in('id', ids)
    .select('id')
  if (error || data?.length !== ids.length) {
    throw new Error(`${table} 연결 이전 실패: ${error?.message || `${ids.length}행 중 ${data?.length || 0}행 저장`}`)
  }
}

async function restoreRowsContentId(table, rows) {
  for (const row of rows) {
    const { error } = await sb.from(table).update({ content_id: row.content_id }).eq('id', row.id)
    if (error) throw new Error(`${table} 롤백 실패(${row.id}): ${error.message}`)
  }
}

function mergeLocalePatch(source, target, targetMetadata) {
  const patch = {}
  for (const field of ['title', 'creator', 'thumbnail_url', 'description', 'isbn', 'publisher', 'affiliate_url', 'verified']) {
    if ((target?.[field] === null || target?.[field] === undefined || target?.[field] === '')
      && source?.[field] !== null && source?.[field] !== undefined && source?.[field] !== '') {
      patch[field] = source[field]
    }
  }
  patch.sources = cleanedItunesSources(target?.sources || source?.sources, {
    artwork: target?.thumbnail_url || source?.thumbnail_url || null,
    itunesUrl: targetMetadata?.itunesUrl || '',
  })
  return patch
}

async function loadMergeReferences(sourceId, targetId) {
  const [sourceMembers, targetMembers, sourceCelebs, targetCelebs, records, notes, flowNodes, activity, curated, fiction] = await Promise.all([
    selectByContentId('member_contents', 'id,member_id,content_id', sourceId),
    selectByContentId('member_contents', 'id,member_id,content_id', targetId),
    selectByContentId('celeb_contents', 'id,celeb_id,content_id', sourceId),
    selectByContentId('celeb_contents', 'id,celeb_id,content_id', targetId),
    selectByContentId('records', 'id,content_id', sourceId),
    selectByContentId('notes', 'id,content_id', sourceId),
    selectByContentId('flow_nodes', 'id,content_id', sourceId),
    selectByContentId('activity_logs', 'id,content_id', sourceId),
    selectByContentId('curated_list_items', 'id,content_id', sourceId),
    selectByContentId('fiction_source_contents', 'content_id', sourceId),
  ])
  const targetMemberIds = new Set(targetMembers.map((row) => row.member_id))
  const targetCelebIds = new Set(targetCelebs.map((row) => row.celeb_id))
  return {
    member_contents: sourceMembers,
    celeb_contents: sourceCelebs,
    records,
    notes,
    flow_nodes: flowNodes,
    activity_logs: activity,
    curated_list_items: curated,
    fiction,
    memberConflicts: sourceMembers.filter((row) => targetMemberIds.has(row.member_id)),
    celebConflicts: sourceCelebs.filter((row) => targetCelebIds.has(row.celeb_id)),
  }
}

async function loadBonusFlowNodes(sourceId) {
  const { data, error } = await sb.from('flow_nodes')
    .select('id,bonus_content_ids')
    .filter('bonus_content_ids', 'cs', JSON.stringify([sourceId]))
  if (error) throw new Error(`flow_nodes bonus 조회 실패: ${error.message}`)
  return data || []
}

async function mergeIntoCanonical(sourceId, targetId) {
  const [{ data: source, error: sourceError }, { data: target, error: targetError }] = await Promise.all([
    sb.from('contents').select('*,content_locales(*)').eq('id', sourceId).single(),
    sb.from('contents').select('*,content_locales(*)').eq('id', targetId).single(),
  ])
  if (sourceError || !source) throw new Error(`병합 원본 조회 실패: ${sourceError?.message || sourceId}`)
  if (targetError || !target) throw new Error(`병합 대상 조회 실패: ${targetError?.message || targetId}`)
  if (target.external_source !== 'itunes' || !target.metadata?.previewUrl) throw new Error('병합 대상 iTunes 미리듣기 검증 실패')

  const refs = await loadMergeReferences(sourceId, targetId)
  if (refs.fiction.length) throw new Error('fiction_source_contents 연결이 있어 자동 병합할 수 없다')
  if (refs.memberConflicts.length || refs.celebConflicts.length) {
    throw new Error(`관계 중복 충돌(member ${refs.memberConflicts.length}, celeb ${refs.celebConflicts.length})`)
  }
  const bonusNodes = await loadBonusFlowNodes(sourceId)
  const targetLocales = new Map((target.content_locales || []).map((locale) => [locale.locale, locale]))
  const localeRollbacks = []
  const insertedLocales = []
  const movedTables = []
  const bonusRollbacks = []

  try {
    for (const sourceLocale of source.content_locales || []) {
      const targetLocale = targetLocales.get(sourceLocale.locale)
      if (!targetLocale) {
        const insert = {
          ...sourceLocale,
          content_id: targetId,
          sources: cleanedItunesSources(sourceLocale.sources, {
            artwork: sourceLocale.thumbnail_url,
            itunesUrl: target.metadata?.itunesUrl || '',
          }),
        }
        delete insert.created_at
        delete insert.updated_at
        const { error } = await sb.from('content_locales').insert(insert)
        if (error) throw new Error(`병합 locale 추가 실패(${sourceLocale.locale}): ${error.message}`)
        insertedLocales.push(sourceLocale.locale)
        continue
      }
      const patch = mergeLocalePatch(sourceLocale, targetLocale, target.metadata)
      localeRollbacks.push({ locale: targetLocale.locale, row: targetLocale })
      const { data, error } = await sb.from('content_locales')
        .update(patch)
        .eq('content_id', targetId)
        .eq('locale', targetLocale.locale)
        .select('content_id')
      if (error || data?.length !== 1) throw new Error(`병합 locale 보강 실패(${targetLocale.locale}): ${error?.message || '1행 아님'}`)
    }

    for (const table of ['member_contents', 'celeb_contents', 'records', 'notes', 'flow_nodes', 'activity_logs', 'curated_list_items']) {
      const rows = refs[table]
      await updateRowsContentId(table, rows, targetId)
      if (rows.length) movedTables.push({ table, rows })
    }

    for (const node of bonusNodes) {
      const next = [...new Set((node.bonus_content_ids || []).map((id) => id === sourceId ? targetId : id))]
      const { data, error } = await sb.from('flow_nodes').update({ bonus_content_ids: next }).eq('id', node.id).select('id')
      if (error || data?.length !== 1) throw new Error(`flow_nodes bonus 이전 실패(${node.id}): ${error?.message || '1행 아님'}`)
      bonusRollbacks.push(node)
    }

    const remainingRefs = await loadMergeReferences(sourceId, targetId)
    const remainingBonus = await loadBonusFlowNodes(sourceId)
    const remainingCount = ['member_contents', 'celeb_contents', 'records', 'notes', 'flow_nodes', 'activity_logs', 'curated_list_items']
      .reduce((sum, table) => sum + remainingRefs[table].length, 0) + remainingBonus.length + remainingRefs.fiction.length
    if (remainingCount) throw new Error(`병합 전 원본 참조가 ${remainingCount}개 남았다`)

    const { data: deleted, error: deleteError } = await sb.from('contents').delete().eq('id', sourceId).select('id')
    if (deleteError || deleted?.length !== 1) throw new Error(`병합 원본 삭제 실패: ${deleteError?.message || '1행 아님'}`)
  } catch (error) {
    const rollbackErrors = []
    for (const node of bonusRollbacks.reverse()) {
      const result = await sb.from('flow_nodes').update({ bonus_content_ids: node.bonus_content_ids }).eq('id', node.id)
      if (result.error) rollbackErrors.push(`flow_nodes bonus ${node.id}: ${result.error.message}`)
    }
    for (const moved of movedTables.reverse()) {
      try { await restoreRowsContentId(moved.table, moved.rows) } catch (rollbackError) { rollbackErrors.push(rollbackError.message) }
    }
    for (const locale of insertedLocales) {
      const result = await sb.from('content_locales').delete().eq('content_id', targetId).eq('locale', locale)
      if (result.error) rollbackErrors.push(`locale insert ${locale}: ${result.error.message}`)
    }
    for (const rollback of localeRollbacks.reverse()) {
      const patch = { ...rollback.row }
      delete patch.content_id
      delete patch.locale
      delete patch.created_at
      delete patch.updated_at
      const result = await sb.from('content_locales').update(patch).eq('content_id', targetId).eq('locale', rollback.locale)
      if (result.error) rollbackErrors.push(`locale ${rollback.locale}: ${result.error.message}`)
    }
    throw new Error(`${error.message}${rollbackErrors.length ? ` / 롤백 오류: ${rollbackErrors.join('; ')}` : ''}`)
  }

  const [{ data: sourceAfter }, { data: targetAfter, error: verifyError }] = await Promise.all([
    sb.from('contents').select('id').eq('id', sourceId).maybeSingle(),
    sb.from('contents').select('id,external_source,external_id,metadata,member_count,celeb_count,record_count').eq('id', targetId).single(),
  ])
  if (sourceAfter || verifyError || targetAfter?.external_source !== 'itunes' || !targetAfter?.metadata?.previewUrl) {
    throw new Error('병합 저장 후 정합성 검증 실패')
  }
  return { action: 'merged', targetContentId: targetId, externalId: targetAfter.external_id }
}

async function batchLookupProposals(jobs) {
  const validations = new Map()
  const trackJobsByCountry = new Map()
  const albumJobsByCountry = new Map()

  for (const job of jobs) {
    const country = job.proposal.country || 'US'
    if (job.proposal.entity === 'track') {
      const jobsById = trackJobsByCountry.get(country) || new Map()
      const grouped = jobsById.get(job.proposal.id) || []
      grouped.push(job)
      jobsById.set(job.proposal.id, grouped)
      trackJobsByCountry.set(country, jobsById)
      continue
    }
    if (job.proposal.entity === 'album') {
      const jobsById = albumJobsByCountry.get(country) || new Map()
      const grouped = jobsById.get(job.proposal.id) || {
        id: job.proposal.id,
        totalTracks: job.proposal.totalTracks || 0,
        jobs: [],
      }
      grouped.jobs.push(job)
      jobsById.set(job.proposal.id, grouped)
      albumJobsByCountry.set(country, jobsById)
      continue
    }
    validations.set(job.contentId, { error: `지원하지 않는 확정 엔티티: ${job.proposal.entity}` })
  }

  for (const [country, jobsById] of trackJobsByCountry) {
    for (const chunk of chunkByCount([...jobsById.entries()], 100)) {
      const ids = chunk.map(([id]) => id).join(',')
      const results = await itunesRequest(`https://itunes.apple.com/lookup?id=${ids}&country=${country}`)
      for (const [id, groupedJobs] of chunk) {
        const track = results.find((result) => result.wrapperType === 'track' && result.trackId === Number(id))
        for (const job of groupedJobs) {
          if (!track) {
            validations.set(job.contentId, { error: `확정 트랙 재조회 실패: ${id}` })
            continue
          }
          const candidate = toCandidate(track, 'track', {
            country,
            query: job.proposal.query || '',
            rank: 0,
          })
          validations.set(job.contentId, candidate
            ? { candidate: { ...candidate, score: candidateScore(job.source, candidate) } }
            : { error: `확정 트랙 변환 실패: ${id}` })
        }
      }
    }
  }

  for (const [country, jobsById] of albumJobsByCountry) {
    const packs = packByWeight([...jobsById.values()], {
      maxItems: 20,
      maxWeight: 180,
      weightOf: (grouped) => Math.max(2, (grouped.totalTracks || 25) + 1),
    })
    for (const pack of packs) {
      const ids = pack.map((grouped) => grouped.id).join(',')
      const results = await itunesRequest(
        `https://itunes.apple.com/lookup?id=${ids}&entity=song&country=${country}&limit=200`
      )
      for (const grouped of pack) {
        const collection = results.find((result) => (
          result.wrapperType === 'collection' && result.collectionId === grouped.id
        ))
        for (const job of grouped.jobs) {
          if (!collection) {
            validations.set(job.contentId, { error: `확정 앨범 재조회 실패: ${grouped.id}` })
            continue
          }
          const candidate = albumCandidateFromResults(
            { ...job.proposal, country },
            job.source,
            results
          )
          validations.set(job.contentId, { candidate })
        }
      }
    }
  }

  return validations
}

async function migrateInPlace(row, candidate) {
  const originalLocales = (row.content_locales || []).map((locale) => ({ ...locale }))
  const metadata = {
    ...withoutSpotifyMetadata(row.metadata),
    previewUrl: candidate.previewUrl,
    itunesUrl: candidate.itunesUrl,
    entityType: candidate.entity,
    albumType: candidate.entity,
    totalTracks: candidate.totalTracks || 0,
    artists: candidate.artist ? [candidate.artist] : [],
    genre: candidate.genre || '',
    releaseDate: candidate.releaseDate || '',
  }

  try {
    for (const locale of row.content_locales || []) {
      const patch = {
        sources: cleanedItunesSources(locale.sources, {
          artwork: candidate.artwork,
          itunesUrl: candidate.itunesUrl,
        }),
      }
      if (candidate.artwork) patch.thumbnail_url = candidate.artwork
      const { data, error } = await sb.from('content_locales')
        .update(patch)
        .eq('content_id', row.id)
        .eq('locale', locale.locale)
        .select('content_id')
      if (error || data?.length !== 1) throw new Error(`locale 저장 실패(${locale.locale}): ${error?.message || '1행 아님'}`)
    }

    const { data, error } = await sb.from('contents')
      .update({ external_source: 'itunes', external_id: `itunes-${candidate.id}`, metadata })
      .eq('id', row.id)
      .eq('external_source', row.external_source)
      .select('id')
    if (error || data?.length !== 1) throw new Error(`contents 저장 실패: ${error?.message || '원본 1행 아님'}`)

    const { data: saved, error: verifyError } = await sb.from('contents')
      .select('id,external_source,external_id,metadata,content_locales(locale,thumbnail_url,sources)')
      .eq('id', row.id)
      .single()
    if (verifyError) throw new Error(`저장 후 재조회 실패: ${verifyError.message}`)
    const valid = saved.external_source === 'itunes'
      && saved.external_id === `itunes-${candidate.id}`
      && saved.metadata?.previewUrl === candidate.previewUrl
      && saved.metadata?.entityType === candidate.entity
      && (saved.content_locales || []).every((locale) => locale.sources?.primary === 'itunes' && !hasSpotifyValue(locale.sources))
    if (!valid) throw new Error('저장 후 정합성 검증 실패')
  } catch (error) {
    const rollbackErrors = []
    const contentRollback = await sb.from('contents').update({
      external_source: row.external_source,
      external_id: row.external_id,
      metadata: row.metadata,
    }).eq('id', row.id)
    if (contentRollback.error) rollbackErrors.push(`contents: ${contentRollback.error.message}`)
    for (const locale of originalLocales) {
      const result = await sb.from('content_locales').update({
        thumbnail_url: locale.thumbnail_url,
        sources: locale.sources,
      }).eq('content_id', row.id).eq('locale', locale.locale)
      if (result.error) rollbackErrors.push(`locale ${locale.locale}: ${result.error.message}`)
    }
    throw new Error(`${error.message}${rollbackErrors.length ? ` / 롤백 오류: ${rollbackErrors.join('; ')}` : ''}`)
  }
  return { action: 'migrated', targetContentId: row.id, externalId: `itunes-${candidate.id}` }
}

function storefrontsFor(row) {
  const url = typeof row.metadata?.itunesUrl === 'string' ? row.metadata.itunesUrl : ''
  const fromUrl = url.match(/music\.apple\.com\/([a-z]{2})\//i)?.[1]?.toUpperCase()
  return [...new Set([fromUrl, 'US', 'KR', 'GB'].filter(Boolean))]
}

function validationContext(row, entityInfo) {
  const identity = spotifyIdentity(row, entityInfo)
  const trustedEntityInfo = identity.trusted
    ? entityInfo
    : { ...entityInfo, spotifyTitle: null, spotifyArtists: [], spotifyTracks: null }
  const aliases = sourceAliases(row, trustedEntityInfo)
  return {
    identity,
    source: scoringSource(aliases, trustedEntityInfo),
  }
}

function rejectedValidation(reason, candidate = null) {
  return { accepted: false, reason, candidate }
}

function acceptedValidation(candidate, currentId) {
  return {
    accepted: true,
    reason: null,
    candidate,
    matchType: candidate.id === currentId ? 'current_lookup' : 'current_collection',
  }
}

function albumSeedFromDirect(direct, country) {
  if (direct.wrapperType === 'collection' && Number.isInteger(direct.collectionId)) {
    return toCandidate(direct, 'album', { country, query: 'current-id-batch', rank: 0 })
  }
  if (!Number.isInteger(direct.collectionId) || !direct.collectionName || !direct.artistName) return null
  return {
    id: direct.collectionId,
    entity: 'album',
    title: direct.collectionName,
    artist: direct.artistName,
    previewUrl: direct.previewUrl || null,
    itunesUrl: direct.collectionViewUrl || '',
    artwork: (direct.artworkUrl100 || direct.artworkUrl60 || '')
      .replace(/\/\d+x\d+bb\.(jpg|png)$/, '/600x600bb.$1') || null,
    releaseDate: (direct.releaseDate || '').slice(0, 10) || null,
    genre: direct.primaryGenreName || null,
    totalTracks: direct.trackCount || 0,
    country,
    query: 'current-track-collection-batch',
    rank: 0,
  }
}

async function batchValidateCurrentItunes(rows, entityCache) {
  const validations = new Map()
  const directJobsByCountry = new Map()

  for (const row of rows) {
    const entityInfo = entityCache.items?.[row.id] || { entity: 'unknown' }
    const context = validationContext(row, entityInfo)
    if (!context.identity.trusted) {
      validations.set(row.id, rejectedValidation('untrusted_spotify_identity'))
      continue
    }
    const rawId = String(row.external_id || '').replace(/^itunes[-_]/, '')
    if (!/^\d+$/.test(rawId)) {
      validations.set(row.id, rejectedValidation('invalid_external_id'))
      continue
    }
    const country = storefrontsFor(row)[0] || 'US'
    const jobs = directJobsByCountry.get(country) || new Map()
    const job = jobs.get(rawId) || { id: Number(rawId), rows: [] }
    job.rows.push({ row, entityInfo, context })
    jobs.set(rawId, job)
    directJobsByCountry.set(country, jobs)
  }

  const albumJobsByCountry = new Map()
  for (const [country, jobsById] of directJobsByCountry) {
    for (const jobs of chunkByCount([...jobsById.values()], 100)) {
      const ids = jobs.map((job) => job.id).join(',')
      const results = await itunesRequest(`https://itunes.apple.com/lookup?id=${ids}&country=${country}`)
      for (const job of jobs) {
        const direct = results.find((result) => result.trackId === job.id)
          || results.find((result) => result.wrapperType === 'collection' && result.collectionId === job.id)
        if (!direct) {
          for (const { row } of job.rows) validations.set(row.id, rejectedValidation('not_found'))
          continue
        }
        for (const item of job.rows) {
          const { row, entityInfo, context } = item
          if (entityInfo.entity === 'track') {
            const candidate = direct.trackId === job.id
              ? toCandidate(direct, 'track', { country, query: 'current-id-batch', rank: 0 })
              : null
            if (candidate) candidate.score = candidateScore(context.source, candidate)
            const accepted = candidate?.previewUrl && confident([candidate], 'track')
            validations.set(row.id, accepted
              ? acceptedValidation(candidate, job.id)
              : rejectedValidation(candidate?.previewUrl ? 'identity_or_score_mismatch' : 'no_preview', candidate))
            continue
          }

          const seed = albumSeedFromDirect(direct, country)
          if (!seed) {
            validations.set(row.id, rejectedValidation('album_collection_not_found'))
            continue
          }
          const albumJobs = albumJobsByCountry.get(country) || new Map()
          const albumJob = albumJobs.get(seed.id) || { seed, rows: [] }
          albumJob.rows.push({ ...item, currentId: job.id })
          albumJobs.set(seed.id, albumJob)
          albumJobsByCountry.set(country, albumJobs)
        }
      }
    }
  }

  for (const [country, jobsById] of albumJobsByCountry) {
    const packs = packByWeight([...jobsById.values()], {
      maxItems: 20,
      maxWeight: 180,
      weightOf: (job) => Math.max(2, (job.seed.totalTracks || 25) + 1),
    })
    for (const pack of packs) {
      const ids = pack.map((job) => job.seed.id).join(',')
      const results = await itunesRequest(
        `https://itunes.apple.com/lookup?id=${ids}&entity=song&country=${country}&limit=200`
      )
      for (const job of pack) {
        for (const { row, context, currentId } of job.rows) {
          const candidate = albumCandidateFromResults(job.seed, context.source, results)
          const accepted = candidate.previewUrl && confident([candidate], 'album')
          validations.set(row.id, accepted
            ? acceptedValidation(candidate, currentId)
            : rejectedValidation(candidate.previewUrl ? 'identity_or_score_mismatch' : 'no_preview', candidate))
        }
      }
    }
  }

  return validations
}

async function validateCurrentItunes(row, entityInfo, identity) {
  const rawId = String(row.external_id || '').replace(/^itunes[-_]/, '')
  if (!/^\d+$/.test(rawId)) return { accepted: false, reason: 'invalid_external_id', candidate: null }
  const id = Number(rawId)
  const trustedEntityInfo = identity.trusted
    ? entityInfo
    : { ...entityInfo, spotifyTitle: null, spotifyArtists: [], spotifyTracks: null }
  const aliases = sourceAliases(row, trustedEntityInfo)
  const source = scoringSource(aliases, trustedEntityInfo)
  let fallback = null

  for (const country of storefrontsFor(row)) {
    const results = await itunesRequest(`https://itunes.apple.com/lookup?id=${id}&entity=song&country=${country}&limit=200`)
    const directTrack = results.find((result) => result.trackId === id)
    const collection = results.find((result) => result.wrapperType === 'collection' && result.collectionId === id)
    const previewTrack = collection
      ? results.find((result) => result.collectionId === id && result.previewUrl)
      : null
    let candidate = directTrack
      ? toCandidate(directTrack, 'track', { country, query: 'current-id', rank: 0 })
      : collection
        ? toCandidate(collection, 'album', { country, query: 'current-id', rank: 0 })
        : null
    if (!candidate) continue
    if (candidate.entity === 'album') {
      candidate.previewUrl = previewTrack?.previewUrl || null
      candidate.appleTracks = appleTrackSignature(results, id)
      candidate.albumChecked = true
    } else if (identity.trusted && entityInfo.entity === 'album' && directTrack.collectionId) {
      const albumSeed = {
        id: directTrack.collectionId,
        entity: 'album',
        title: directTrack.collectionName || '',
        artist: directTrack.artistName || '',
        previewUrl: directTrack.previewUrl || null,
        itunesUrl: directTrack.collectionViewUrl || '',
        artwork: (directTrack.artworkUrl100 || directTrack.artworkUrl60 || '')
          .replace(/\/\d+x\d+bb\.(jpg|png)$/, '/600x600bb.$1') || null,
        releaseDate: (directTrack.releaseDate || '').slice(0, 10) || null,
        genre: directTrack.primaryGenreName || null,
        totalTracks: directTrack.trackCount || 0,
        country,
        query: 'current-track-collection',
        rank: 0,
      }
      candidate = await lookupAlbumCandidate(albumSeed, source)
    }
    candidate.score = candidateScore(source, candidate)
    fallback ||= candidate

    const entityAllowed = identity.trusted && candidate.entity === entityInfo.entity
    const accepted = entityAllowed && Boolean(candidate.previewUrl) && Boolean(confident([candidate], candidate.entity))
    if (accepted) {
      return {
        accepted: true,
        reason: null,
        candidate,
        matchType: candidate.id === id ? 'current_lookup' : 'current_collection',
      }
    }
  }

  return {
    accepted: false,
    reason: fallback?.previewUrl ? 'identity_or_score_mismatch' : fallback ? 'no_preview' : 'not_found',
    candidate: fallback,
  }
}

function normalizeVerifiedItems(state) {
  let normalized = 0
  for (const item of Object.values(state.items || {})) {
    if (item.status !== 'matched'
      || item.currentSourceAtScan !== 'itunes'
      || item.matchType !== 'current_lookup'
      || item.apply?.status === 'applied') continue
    item.status = 'verified'
    delete item.proposal
    delete item.candidates
    delete item.aliases
    normalized++
  }
  return normalized
}

async function scan() {
  const entityState = await readJson(ENTITY_STATE_PATH)
  if (entityState?.status !== 'complete') throw new Error('Spotify 엔티티 분류가 아직 완료되지 않았다')
  const entityCache = await readJson(ENTITY_CACHE_PATH)
  if (!entityCache?.items) throw new Error('Spotify 엔티티 분류 캐시가 없다')

  const [spotifyRows, itunesRows] = await Promise.all([
    loadAll(
      'contents',
      'id,external_id,external_source,metadata,content_locales(locale,title,creator,thumbnail_url,sources)',
      (query) => query.eq('type', 'MUSIC').eq('external_source', 'spotify').order('id')
    ),
    loadAll(
      'contents',
      'id,external_id,external_source,metadata,content_locales(locale,title,creator,thumbnail_url,sources)',
      (query) => query.eq('type', 'MUSIC').eq('external_source', 'itunes').order('id')
    ),
  ])
  const exactIndex = buildExactIndex(itunesRows, entityCache)
  const originalItunesRows = itunesRows.filter((row) => entityCache.items?.[row.id])
  const targetRows = [...spotifyRows, ...originalItunesRows]
    .sort((left, right) => left.id.localeCompare(right.id))
  const state = await readJson(PRECISION_STATE_PATH, {
    version: 1,
    status: 'running',
    items: {},
    startedAt: new Date().toISOString(),
  })
  state.status = 'running'
  delete state.error
  delete state.cooldownUntil
  const normalized = normalizeVerifiedItems(state)
  if (normalized) console.log(`기존 정상 iTunes ${normalized}건은 verified로 전환해 DB 반영 대상에서 제외`)

  const pendingRows = targetRows
    .filter((row) => (!AFTER || row.id > AFTER) && !state.items[row.id])
    .slice(0, LIMIT)
  const currentValidations = await batchValidateCurrentItunes(
    pendingRows.filter((row) => row.external_source === 'itunes'),
    entityCache
  )

  for (const row of pendingRows) {
    const entityInfo = entityCache.items[row.id] || { entity: 'unknown' }
    const identity = spotifyIdentity(row, entityInfo)
    let currentValidation = null
    let result
    try {
      currentValidation = row.external_source === 'itunes'
        ? currentValidations.get(row.id) || await validateCurrentItunes(row, entityInfo, identity)
        : null
      result = currentValidation?.accepted
        ? currentValidation.matchType === 'current_lookup'
          ? {
              status: 'verified',
              sourceEntity: currentValidation.candidate.entity,
              matchType: currentValidation.matchType,
              verifiedExternalId: row.external_id,
            }
          : {
              status: 'matched',
              sourceEntity: currentValidation.candidate.entity,
              matchType: currentValidation.matchType,
              proposal: currentValidation.candidate,
            }
        : await scanEntities(row, entityInfo, identity, exactIndex)
    } catch (error) {
      if (/속도 제한\((403|429)\)/.test(error.message)) throw error
      result = {
        status: 'scan_error',
        sourceEntity: identity.trusted ? entityInfo.entity : null,
        error: error instanceof Error ? error.message : String(error),
      }
    }
    state.items[row.id] = {
      originalSpotifyEntity: entityInfo.entity === 'unknown' ? null : entityInfo.entity,
      spotifyIdentity: identity,
      spotifyIdentityTrusted: identity.trusted,
      currentSourceAtScan: row.external_source,
      currentExternalIdAtScan: row.external_id,
      correction: row.external_source === 'itunes',
      currentValidation: currentValidation && {
        accepted: currentValidation.accepted,
        reason: currentValidation.reason,
        candidate: currentValidation.candidate && {
          id: currentValidation.candidate.id,
          entity: currentValidation.candidate.entity,
          title: currentValidation.candidate.title,
          artist: currentValidation.candidate.artist,
          score: currentValidation.candidate.score,
        },
      },
      ...result,
    }
    state.updatedAt = new Date().toISOString()
    state.summary = summarize(state.items)
    state.remainingUnscanned = targetRows.length - Object.keys(state.items).length
    assignCounters(state)
    await writeJson(PRECISION_STATE_PATH, state)
    console.log(`정밀 스캔 ${Object.keys(state.items).length}/${targetRows.length}: ${row.id} → ${state.items[row.id].status}`)
  }

  const unscanned = targetRows.filter((row) => !state.items[row.id]).length
  state.status = unscanned === 0 ? 'scan_complete' : 'scan_paused'
  state.remainingUnscanned = unscanned
  state.updatedAt = new Date().toISOString()
  state.summary = summarize(state.items)
  assignCounters(state)
  await writeJson(PRECISION_STATE_PATH, state)
  console.log(JSON.stringify({ status: state.status, summary: state.summary, ...counterSnapshot(state) }, null, 2))
}

async function apply() {
  const entityState = await readJson(ENTITY_STATE_PATH)
  if (entityState?.status !== 'complete') throw new Error('Spotify 엔티티 분류가 아직 완료되지 않았다')
  const entityCache = await readJson(ENTITY_CACHE_PATH)
  const state = await readJson(PRECISION_STATE_PATH)
  if (!state?.items) throw new Error('정밀 스캔 결과가 없다')

  const musicRows = await loadAll(
    'contents',
    'id,external_id,external_source,metadata,content_locales(*)',
    (query) => query.eq('type', 'MUSIC').order('id')
  )
  const rowById = new Map(musicRows.map((row) => [row.id, row]))
  let handled = 0
  let applied = 0
  let failed = 0

  const proposalJobs = []
  for (const [contentId, item] of Object.entries(state.items)) {
    if (item.status !== 'matched' || item.apply?.status === 'applied' || item.matchType === 'existing_exact') continue
    const row = rowById.get(contentId)
    if (!row
      || (item.currentSourceAtScan && row.external_source !== item.currentSourceAtScan)
      || (item.currentExternalIdAtScan && row.external_id !== item.currentExternalIdAtScan)) continue
    const entityInfo = entityCache.items?.[contentId] || { entity: 'unknown' }
    if (item.originalSpotifyEntity && entityInfo.entity !== item.originalSpotifyEntity) continue
    const trustedEntityInfo = item.spotifyIdentityTrusted
      ? entityInfo
      : { ...entityInfo, spotifyTitle: null, spotifyArtists: [], spotifyTracks: null }
    const aliases = sourceAliases(row, trustedEntityInfo)
    proposalJobs.push({
      contentId,
      proposal: item.proposal,
      source: scoringSource(aliases, trustedEntityInfo),
    })
  }
  const proposalValidations = await batchLookupProposals(proposalJobs)
  if (proposalJobs.length) {
    state.status = 'apply_validated'
    state.updatedAt = new Date().toISOString()
    assignCounters(state)
    await writeJson(PRECISION_STATE_PATH, state)
  }

  for (const [contentId, item] of Object.entries(state.items).sort(([left], [right]) => left.localeCompare(right))) {
    if (handled >= LIMIT) break
    if (item.status !== 'matched' || item.apply?.status === 'applied') continue
    const row = rowById.get(contentId)
    if (!row) {
      item.apply = { status: 'skipped', reason: '원본 음악 행이 더 이상 존재하지 않음', updatedAt: new Date().toISOString() }
      continue
    }
    if (item.currentSourceAtScan && row.external_source !== item.currentSourceAtScan) {
      item.apply = { status: 'failed', reason: `외부 출처가 스캔 뒤 변경됨(${item.currentSourceAtScan} → ${row.external_source})`, updatedAt: new Date().toISOString() }
      failed++
      continue
    }
    if (item.currentExternalIdAtScan && row.external_id !== item.currentExternalIdAtScan) {
      item.apply = { status: 'failed', reason: `외부 ID가 스캔 뒤 변경됨(${item.currentExternalIdAtScan} → ${row.external_id})`, updatedAt: new Date().toISOString() }
      failed++
      continue
    }
    const entityInfo = entityCache.items?.[contentId] || { entity: 'unknown' }
    if (item.originalSpotifyEntity && entityInfo.entity !== item.originalSpotifyEntity) {
      item.apply = { status: 'failed', reason: '엔티티 분류가 스캔 시점과 다름', updatedAt: new Date().toISOString() }
      failed++
      continue
    }
    handled++

    try {
      let result
      if (item.matchType === 'existing_exact') {
        const { data: target, error } = await sb.from('contents')
          .select('id,external_source,external_id,metadata')
          .eq('id', item.proposal.targetContentId)
          .single()
        if (error || !target) throw new Error(`기존 정본 조회 실패: ${error?.message || item.proposal.targetContentId}`)
        if (target.external_source !== 'itunes' || !target.metadata?.previewUrl) throw new Error('기존 정본이 재생 가능한 iTunes 행이 아니다')
        if (metadataEntity(target, entityCache) !== item.sourceEntity) throw new Error('기존 정본 엔티티가 원본과 다르다')
        result = await mergeIntoCanonical(contentId, target.id)
      } else {
        const validation = proposalValidations.get(contentId)
        if (!validation) throw new Error('확정 후보 묶음 재조회 결과가 없다')
        if (validation.error) throw new Error(validation.error)
        const candidate = validation.candidate
        if (!candidate || candidate.id !== item.proposal.id || candidate.entity !== item.sourceEntity) {
          throw new Error('확정 후보 재조회 결과가 스캔과 다르다')
        }
        if (!candidate.previewUrl) throw new Error('확정 후보에 미리듣기가 없다')
        const aiValidation = item.matchType === 'ai_review'
          ? validateAiReviewCandidate(item, candidate)
          : null
        if (aiValidation && !aiValidation.ok) {
          throw new Error(`AI 판정 후보 재검증 실패(${aiValidation.reason})`)
        }
        if (!aiValidation && !confident([candidate], item.sourceEntity)) {
          throw new Error(`확정 후보 재검증 점수 미달(${candidate.score.total.toFixed(3)})`)
        }

        if (item.matchType === 'current_lookup') {
          const expectedExternalId = `itunes-${candidate.id}`
          if (row.external_id !== expectedExternalId) {
            throw new Error(`현재 iTunes ID가 검증 후보와 다르다(${row.external_id} → ${expectedExternalId})`)
          }
          result = await migrateInPlace(row, candidate)
        } else {
          const externalId = `itunes-${candidate.id}`
          const { data: existing, error: existingError } = await sb.from('contents')
            .select('id,external_source,external_id,metadata')
            .eq('type', 'MUSIC')
            .eq('external_source', 'itunes')
            .eq('external_id', externalId)
            .limit(3)
          if (existingError) throw new Error(`iTunes 정본 중복 조회 실패: ${existingError.message}`)
          const canonicalRows = (existing || []).filter((candidateRow) => candidateRow.id !== contentId)
          if (canonicalRows.length > 1) throw new Error(`동일 iTunes ID 정본이 ${canonicalRows.length}개다`)
          if (canonicalRows[0]) {
            if (metadataEntity(canonicalRows[0], entityCache) !== item.sourceEntity) throw new Error('동일 iTunes ID 정본의 엔티티가 다르다')
            result = await mergeIntoCanonical(contentId, canonicalRows[0].id)
          } else {
            result = await migrateInPlace(row, candidate)
          }
        }
      }

      item.apply = { status: 'applied', ...result, updatedAt: new Date().toISOString() }
      applied++
      rowById.delete(contentId)
    } catch (error) {
      if (/속도 제한\((403|429)\)/.test(error.message)) {
        state.status = 'apply_paused_rate_limit'
        state.updatedAt = new Date().toISOString()
        assignCounters(state)
        state.applySummary = { applied, failed, ...counterSnapshot(state) }
        await writeJson(PRECISION_STATE_PATH, state)
        throw error
      }
      item.apply = { status: 'failed', reason: error.message, updatedAt: new Date().toISOString() }
      failed++
    }

    state.status = 'applying'
    state.updatedAt = new Date().toISOString()
    assignCounters(state)
    state.applySummary = { applied, failed, ...counterSnapshot(state) }
    await writeJson(PRECISION_STATE_PATH, state)
    console.log(`정밀 반영 ${handled}: ${contentId} → ${item.apply.status}${item.apply.action ? `/${item.apply.action}` : ''}`)
  }

  const unapplied = Object.values(state.items).filter((item) => item.status === 'matched' && item.apply?.status !== 'applied').length
  const { count: spotifyRemaining, error: countError } = await sb.from('contents')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'MUSIC')
    .eq('external_source', 'spotify')
  if (countError) throw new Error(`Spotify 잔존량 조회 실패: ${countError.message}`)
  state.status = unapplied === 0 ? 'apply_complete' : 'apply_paused'
  state.updatedAt = new Date().toISOString()
  state.spotifyRemaining = spotifyRemaining
  assignCounters(state)
  state.applySummary = { applied, failed, unapplied, ...counterSnapshot(state) }
  await writeJson(PRECISION_STATE_PATH, state)
  console.log(JSON.stringify({ status: state.status, spotifyRemaining, ...state.applySummary }, null, 2))
}

async function continuousScan() {
  for (;;) {
    try {
      await scan()
      const state = await readJson(PRECISION_STATE_PATH)
      if (state?.status === 'scan_complete') return
    } catch (error) {
      if (!/속도 제한\((403|429)\)/.test(error.message)) throw error
      const state = await readJson(PRECISION_STATE_PATH, { version: 1, items: {} })
      state.status = 'scan_paused_rate_limit'
      state.error = error.message
      state.cooldownUntil = new Date(Date.now() + 300000).toISOString()
      state.updatedAt = new Date().toISOString()
      await writeJson(PRECISION_STATE_PATH, state)
      console.error(`${error.message} — 5분 냉각 후 마지막 미완료 행부터 재개한다`)
      await sleep(300000)
      nextProviderRequestAt = Date.now()
    }
  }
}

async function rateResilientApply() {
  for (;;) {
    try {
      await apply()
      return
    } catch (error) {
      if (!/속도 제한\((403|429)\)/.test(error.message)) throw error
      console.error(`${error.message} — 5분 냉각 후 마지막 미반영 행부터 재개한다`)
      await sleep(300000)
      nextProviderRequestAt = Date.now()
    }
  }
}

async function auto() {
  await continuousScan()
  await rateResilientApply()
}

const entry = MODE === 'apply' ? apply : AUTO ? auto : CONTINUOUS ? continuousScan : scan
entry().catch((error) => {
  console.error(error)
  process.exit(1)
})
