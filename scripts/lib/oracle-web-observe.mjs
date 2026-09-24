import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { inspectVersionedDeploymentHtml } from './oracle-web-remote.mjs'

export const OBSERVATION_DURATION_MS = 20 * 60 * 1000
export const OBSERVATION_INTERVAL_MS = 60 * 1000
const ORIGIN_CACHE_STATES = new Set(['DYNAMIC', 'BYPASS', 'MISS', 'EXPIRED'])

export async function observeProduction({
  origin = 'https://feelandnote.com', releaseId, probeSlug = 'bill-gates',
  durationMs = OBSERVATION_DURATION_MS, intervalMs = OBSERVATION_INTERVAL_MS,
  timeoutMs = 10_000, readRuntime, onPass = () => {}, now = Date.now, sleep = delay,
} = {}) {
  if (!releaseId) throw new Error('Expected release ID is required')
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 60 * 60 * 1000) throw new Error('Invalid observation duration')
  if (!Number.isFinite(intervalMs) || intervalMs < 1) throw new Error('Invalid observation interval')
  const routes = ['/', '/en', '/explore', '/en/explore', '/library', '/en/library',
    `/celeb/${encodeURIComponent(probeSlug)}`, `/en/celeb/${encodeURIComponent(probeSlug)}`]
  const started = now()
  let baselineRuntime
  let last
  let passes = 0
  async function read(url, { json = false, asset = false } = {}) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': 'feelandnote-deploy-observe/1.0', 'cache-control': 'no-cache' },
    })
    if (response.status !== 200) throw new Error(`Public request returned HTTP ${response.status}: ${url}`)
    const body = await response.arrayBuffer() // The timeout covers the entire body, not only headers.
    if (!body.byteLength) throw new Error(`Public response is empty: ${url}`)
    const cache = response.headers.get('cf-cache-status')
    if (!asset && cache && !ORIGIN_CACHE_STATES.has(cache.toUpperCase())) {
      throw new Error(`Public origin probe received a cached response (${cache}): ${url}`)
    }
    if (asset) return body.byteLength
    const text = Buffer.from(body).toString('utf8')
    return json ? JSON.parse(text) : text
  }
  do {
    const runtime = readRuntime ? await readRuntime() : null
    if (runtime) {
      if (runtime.service !== 'active' || !runtime.mainPid) throw new Error('Web service is not active')
      if (runtime.tunnel !== undefined && runtime.tunnel !== 'active') throw new Error('Web Tunnel is not active')
      if (baselineRuntime && (runtime.mainPid !== baselineRuntime.mainPid || runtime.restarts !== baselineRuntime.restarts)) {
        throw new Error('Web process restarted during public observation')
      }
      baselineRuntime ??= runtime
    }
    const identity = await read(new URL('/api/deployment', origin), { json: true })
    if (identity.id !== releaseId) throw new Error(`Public deployment id ${identity.id} does not match ${releaseId}`)
    const assets = new Set()
    const pages = []
    for (const route of routes) {
      const url = new URL(route, origin)
      // The existing Cache Rules bypass _rsc queries. Without an RSC header Next returns HTML.
      url.searchParams.set('_rsc', `deploy-observe-${releaseId}-${passes}`)
      const pageStarted = now()
      const html = await read(url)
      const version = inspectVersionedDeploymentHtml(html, url.href, releaseId)
      for (const asset of version.staticAssetUrls) {
        if (new URL(asset).origin !== new URL(origin).origin) throw new Error(`Unexpected asset origin: ${asset}`)
        assets.add(asset)
      }
      pages.push({ route, durationMs: now() - pageStarted, bytes: Buffer.byteLength(html) })
    }
    const queue = [...assets]
    let assetBytes = 0
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const bytes = await read(queue.shift(), { asset: true })
        assetBytes += bytes
      }
    }))
    last = { pages, staticAssets: { checked: assets.size, bytes: assetBytes }, runtime }
    passes++
    await onPass({ pass: passes, elapsedMs: now() - started, ...last })
    const remaining = durationMs - (now() - started)
    if (remaining <= 0) break
    await sleep(Math.min(intervalMs, remaining))
  } while (true)
  return { releaseId, passes, elapsedMs: now() - started, last }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  observeProduction({
    releaseId: process.argv[2],
    onPass: pass => console.log(JSON.stringify(pass)),
  }).then(result => console.log(JSON.stringify({ complete: true, ...result }))).catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
