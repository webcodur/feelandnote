/**
 * 타임라인 조사 원본의 외부 근거와 좌표를 전수 검사한다.
 *
 * 실행 (sw/web-bo):
 *   node scripts/timeline-audit.mjs --slugs=ada-lovelace,aeschylus
 *   node scripts/timeline-audit.mjs --file=../../docs/celeb-data/timeline/_batches/deceased-active-2026-08-04.json
 *
 * 형식과 문체는 timeline-import.mjs의 dry-run이 담당한다. 이 도구는
 * sourceUrl 실존 여부, placeQid 좌표와 저장 좌표의 거리, 건수 분포를 담당한다.
 */

import { existsSync, readFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'

const DATA_DIR = resolve(process.cwd(), '../../docs/celeb-data/timeline')
const slugArg = process.argv.find((arg) => arg.startsWith('--slugs='))
const fileArg = process.argv.find((arg) => arg.startsWith('--file='))
const concurrencyArg = process.argv.find((arg) => arg.startsWith('--concurrency='))
const CONCURRENCY = Number(concurrencyArg?.slice('--concurrency='.length) ?? 8)
const UA = { 'user-agent': 'feelandnote-timeline-audit/1.0 (webcodur@gmail.com)' }

if (!Number.isInteger(CONCURRENCY) || CONCURRENCY < 1 || CONCURRENCY > 20) {
  throw new Error('--concurrency는 1~20 정수여야 한다')
}

function selectedSlugs() {
  if (slugArg) {
    return new Set(slugArg.slice('--slugs='.length).split(',').map((slug) => slug.trim()).filter(Boolean))
  }
  if (!fileArg) return null
  const parsed = JSON.parse(readFileSync(resolve(process.cwd(), fileArg.slice('--file='.length)), 'utf-8'))
  const targets = Array.isArray(parsed) ? parsed : (parsed.targets ?? [])
  return new Set(targets.map((target) => target.slug))
}

function readSources() {
  const only = selectedSlugs()
  const files = readdirSync(DATA_DIR)
    .filter((name) => name.endsWith('.json'))
    .filter((name) => !only || only.has(name.slice(0, -5)))
  if (only) {
    const found = new Set(files.map((name) => name.slice(0, -5)))
    const missing = [...only].filter((slug) => !found.has(slug))
    if (missing.length) throw new Error(`조사 원본 없음: ${missing.join(', ')}`)
  }
  return files.map((name) => {
    const path = join(DATA_DIR, name)
    const data = JSON.parse(readFileSync(path, 'utf-8'))
    return { slug: name.slice(0, -5), path, events: data.events ?? data }
  })
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function haversineKm(aLat, aLng, bLat, bLng) {
  const rad = (degree) => degree * Math.PI / 180
  const dLat = rad(bLat - aLat)
  const dLng = rad(bLng - aLng)
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(20_000) })
    return { url, ok: response.ok, status: response.status, finalUrl: response.url }
  } catch (error) {
    return { url, ok: false, status: 0, error: error.message }
  }
}

function claimCoordinates(entity) {
  return (entity?.claims?.P625 ?? [])
    .map((claim) => claim.mainsnak?.datavalue?.value)
    .filter((value) => Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude))
    .map((value) => ({ lat: value.latitude, lng: value.longitude }))
}

async function fetchWikidataBatch(qids) {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: qids.join('|'),
    props: 'claims',
    format: 'json',
    maxlag: '5',
  })
  const url = `https://www.wikidata.org/w/api.php?${params}`
  let lastError = null
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30_000) })
      if (response.ok) {
        const json = await response.json()
        if (!json.error) return json.entities ?? {}
        lastError = new Error(`${json.error.code}: ${json.error.info}`)
      } else {
        lastError = new Error(`HTTP ${response.status}`)
      }
      if (response.status !== 429 && response.status < 500) break
    } catch (error) {
      lastError = error
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1500 * (attempt + 1)))
  }
  throw lastError ?? new Error('Wikidata batch request failed')
}

const people = readSources()
const counts = people.map((person) => person.events.length).sort((a, b) => a - b)
const allEvents = people.flatMap((person) => person.events.map((event) => ({ ...event, slug: person.slug })))
const urls = [...new Set(allEvents.map((event) => event.sourceUrl).filter(Boolean))]
const qids = [...new Set(allEvents.map((event) => event.placeQid).filter(Boolean))]

console.log(`검사 대상 ${people.length}명 · 사건 ${allEvents.length}건 · 링크 ${urls.length}개 · 장소 QID ${qids.length}개`)

const linkResults = await mapLimit(urls, CONCURRENCY, checkUrl)
const deadLinks = linkResults.filter((result) => !result.ok)

const qidResults = new Map()
for (let i = 0; i < qids.length; i += 50) {
  const chunk = qids.slice(i, i + 50)
  try {
    const entities = await fetchWikidataBatch(chunk)
    for (const qid of chunk) qidResults.set(qid, { coordinates: claimCoordinates(entities[qid]) })
  } catch (error) {
    for (const qid of chunk) qidResults.set(qid, { coordinates: [], error: error.message })
  }
}

const coordinateFailures = []
for (const event of allEvents) {
  const hasCoordinates = Number.isFinite(event.lat) && Number.isFinite(event.lng)
  if (!hasCoordinates && !event.placeQid) continue
  if (!hasCoordinates || !event.placeQid) {
    coordinateFailures.push({ slug: event.slug, year: event.year, title: event.title, reason: '좌표/QID 짝 불일치' })
    continue
  }
  const result = qidResults.get(event.placeQid)
  if (!result?.coordinates.length) {
    coordinateFailures.push({ slug: event.slug, year: event.year, title: event.title, reason: `QID 좌표 없음${result?.error ? ` (${result.error})` : ''}` })
    continue
  }
  const distance = Math.min(...result.coordinates.map((coord) => haversineKm(event.lat, event.lng, coord.lat, coord.lng)))
  if (distance > 50) {
    coordinateFailures.push({ slug: event.slug, year: event.year, title: event.title, reason: `${distance.toFixed(1)}km 차이` })
  }
}

const frequencies = new Map()
for (const count of counts) frequencies.set(count, (frequencies.get(count) ?? 0) + 1)
const mode = [...frequencies.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0] ?? [0, 0]
const median = counts.length ? counts[Math.floor(counts.length / 2)] : 0
const boundaryCount = counts.filter((count) => count === 3 || count === 30).length
const countWarnings = []
if (people.length >= 20 && mode[1] / people.length > 0.25) countWarnings.push(`최빈값 ${mode[0]}건에 ${(mode[1] / people.length * 100).toFixed(1)}% 집중`)
if (people.length >= 20 && boundaryCount / people.length > 0.1) countWarnings.push(`3·30건 경계에 ${(boundaryCount / people.length * 100).toFixed(1)}% 집중`)

console.log(`건수 분포 최소 ${counts[0] ?? 0} · 중앙 ${median} · 최대 ${counts.at(-1) ?? 0} · 최빈 ${mode[0]}(${mode[1]}명)`)
if (countWarnings.length) console.log(`건수 편향 경고: ${countWarnings.join(' / ')}`)

for (const failure of deadLinks) console.error(`링크 실패 ${failure.status || 'ERR'} ${failure.url}${failure.error ? ` — ${failure.error}` : ''}`)
for (const failure of coordinateFailures) console.error(`좌표 실패 ${failure.slug} ${failure.year} ${failure.title} — ${failure.reason}`)

console.log(`링크 ${urls.length - deadLinks.length}/${urls.length} 통과 · 좌표 ${allEvents.filter((event) => event.placeQid).length - coordinateFailures.length}/${allEvents.filter((event) => event.placeQid).length} 통과`)
if (deadLinks.length || coordinateFailures.length || countWarnings.length) process.exitCode = 1
