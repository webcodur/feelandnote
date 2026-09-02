import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const LEGACY_RELEASES_ROOT = '/opt/feelandnote/web/releases'
const SLOTS_ROOT = '/opt/feelandnote/web/slots'
const CURRENT_LINK = '/opt/feelandnote/web/current'
const SERVICE_NAME = 'feelandnote-web.service'
const ENV_FILE = '/etc/feelandnote/web.env'
const APP_RELATIVE_PATH = 'sw/web'
const DIST_DIR = '.next-verify'
const RELEASE_METADATA_FILE = '.feelandnote-release.json'
const SLOT_NAMES = ['blue', 'green']
const CADDY_ADMIN_URL = 'http://127.0.0.1:2019'
export const PRIMARY_PORT = 3000
export const TRAFFIC_DRAIN_MS = 5_000
export const STATIC_ASSET_RETENTION_MS = 35 * 24 * 60 * 60 * 1_000

function collectReverseProxyHandlers(value, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectReverseProxyHandlers(item, found)
    return found
  }
  if (!value || typeof value !== 'object') return found
  if (value.handler === 'reverse_proxy' && Array.isArray(value.upstreams)) found.push(value)
  for (const child of Object.values(value)) collectReverseProxyHandlers(child, found)
  return found
}

function loopbackDial(port) {
  return `127.0.0.1:${port}`
}

export function assertBridgePort(port) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === PRIMARY_PORT) {
    throw new Error(`Unsafe bridge port: ${port}`)
  }
  return port
}

export function inspectCaddyProxyPort(config) {
  const handlers = collectReverseProxyHandlers(config)
  const ports = handlers.flatMap((handler) => handler.upstreams)
    .map((upstream) => upstream?.dial?.match(/^127[.]0[.]0[.]1:(\d+)$/u)?.[1])
    .filter(Boolean)
    .map(Number)

  if (ports.length !== 1 || !Number.isInteger(ports[0])) {
    throw new Error(`Expected exactly one loopback Caddy upstream, found ${ports.length}`)
  }
  return ports[0]
}

export function createBridgeCaddyConfig(config, bridgePort) {
  assertBridgePort(bridgePort)
  if (inspectCaddyProxyPort(config) !== PRIMARY_PORT) {
    throw new Error(`Caddy must route to the primary port ${PRIMARY_PORT} before bridging`)
  }

  const bridged = structuredClone(config)
  const handlers = collectReverseProxyHandlers(bridged)
  const matchingHandlers = handlers.filter((handler) => (
    handler.upstreams.length === 1
    && handler.upstreams[0]?.dial === loopbackDial(PRIMARY_PORT)
  ))
  if (matchingHandlers.length !== 1) {
    throw new Error(`Expected one primary Caddy reverse proxy, found ${matchingHandlers.length}`)
  }

  const handler = matchingHandlers[0]
  handler.upstreams[0].dial = loopbackDial(bridgePort)

  const locationReplacements = handler.headers?.response?.replace?.Location
  const matchingLocationReplacements = Array.isArray(locationReplacements)
    ? locationReplacements.filter((entry) => (
        entry
        && typeof entry === 'object'
        && typeof entry.search_regexp === 'string'
        && entry.search_regexp.split(`:${PRIMARY_PORT}`).length === 2
      ))
    : []
  if (matchingLocationReplacements.length !== 1) {
    throw new Error(`Expected one upstream Location rewrite, found ${matchingLocationReplacements.length}`)
  }
  matchingLocationReplacements[0].search_regexp = matchingLocationReplacements[0].search_regexp.replace(
    `:${PRIMARY_PORT}`,
    `:${bridgePort}`,
  )

  if (inspectCaddyProxyPort(bridged) !== bridgePort) {
    throw new Error(`Bridge Caddy configuration did not select port ${bridgePort}`)
  }
  return bridged
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: options.env ?? process.env,
    stdio: options.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  })

  if (result.error) throw result.error
  if (result.status !== 0 && !options.allowFailure) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
    throw new Error(`${command} failed (${result.status})${detail ? `: ${detail}` : ''}`)
  }

  return {
    status: result.status ?? 1,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
  }
}

function argumentValue(args, name) {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

export function assertReleaseId(releaseId) {
  if (typeof releaseId !== 'string' || !/^[a-z0-9][a-z0-9-]{7,79}$/u.test(releaseId)) {
    throw new Error(`Unsafe release id: ${JSON.stringify(releaseId)}`)
  }
  return releaseId
}

export function assertCommitHash(commit) {
  if (typeof commit !== 'string' || !/^[0-9a-f]{40}$/u.test(commit)) {
    throw new Error(`Unsafe commit hash: ${JSON.stringify(commit)}`)
  }
  return commit
}

export function assertUnixAccountName(accountName, label = 'Unix account') {
  if (typeof accountName !== 'string' || !/^[a-z_][a-z0-9_-]{0,31}$/u.test(accountName)) {
    throw new Error(`Unsafe ${label}: ${JSON.stringify(accountName)}`)
  }
  return accountName
}

export function slotsRootInstallArgs(user, group, slotsRoot = SLOTS_ROOT) {
  return [
    'install',
    '-d',
    '-o',
    assertUnixAccountName(user, 'Unix user'),
    '-g',
    assertUnixAccountName(group, 'Unix group'),
    '-m',
    '0750',
    '--',
    slotsRoot,
  ]
}

export function legacyReleasesRootRemoveArgs(legacyReleasesRoot = LEGACY_RELEASES_ROOT) {
  return ['rmdir', '--', legacyReleasesRoot]
}

export function slotNameForPath(candidatePath, slotsRoot = SLOTS_ROOT) {
  if (!candidatePath) return null
  const resolvedCandidate = path.resolve(candidatePath)
  return SLOT_NAMES.find((slot) => resolvedCandidate === path.resolve(slotsRoot, slot)) ?? null
}

export function chooseInactiveSlot(currentPath, slotsRoot = SLOTS_ROOT) {
  const currentSlot = slotNameForPath(currentPath, slotsRoot)
  return currentSlot === 'blue' ? 'green' : 'blue'
}

export function deploymentTargetForPath(
  candidatePath,
  slotsRoot = SLOTS_ROOT,
  legacyReleasesRoot = LEGACY_RELEASES_ROOT,
) {
  const slot = slotNameForPath(candidatePath, slotsRoot)
  if (slot) return slot

  const resolvedCandidate = path.resolve(candidatePath)
  if (path.dirname(resolvedCandidate) !== path.resolve(legacyReleasesRoot)) {
    throw new Error(`Deployment target is outside slots and legacy releases: ${candidatePath}`)
  }
  return assertReleaseId(path.basename(resolvedCandidate))
}

export function resolveDeploymentTarget(
  target,
  slotsRoot = SLOTS_ROOT,
  legacyReleasesRoot = LEGACY_RELEASES_ROOT,
) {
  if (SLOT_NAMES.includes(target)) return path.resolve(slotsRoot, target)
  return path.resolve(legacyReleasesRoot, assertReleaseId(target))
}

export function normalizeManifestPath(rawPath, label = 'manifest path') {
  if (typeof rawPath !== 'string' || rawPath.includes('\0')) {
    throw new Error(`Unsafe ${label}: ${JSON.stringify(rawPath)}`)
  }

  const normalized = path.posix.normalize(rawPath.replaceAll('\\', '/')).replace(/^\.\//u, '')
  if (
    !normalized
    || normalized === '.'
    || path.posix.isAbsolute(normalized)
    || /^[A-Za-z]:\//u.test(normalized)
    || normalized === '..'
    || normalized.startsWith('../')
  ) {
    throw new Error(`Unsafe ${label}: ${JSON.stringify(rawPath)}`)
  }
  return normalized
}

function assertInside(basePath, candidatePath, label) {
  const relative = path.relative(basePath, candidatePath)
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} escaped its root: ${candidatePath}`)
  }
}

export function restoreStandaloneLinks(releaseRoot, manifest) {
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.links)) {
    throw new Error('Unsupported standalone link manifest')
  }

  const normalizedLinks = manifest.links.map((entry) => ({
    link: normalizeManifestPath(entry?.link, 'link path'),
    target: normalizeManifestPath(entry?.target, 'link target'),
  }))

  const duplicateLinks = normalizedLinks
    .map((entry) => entry.link)
    .filter((link, index, links) => links.indexOf(link) !== index)
  if (duplicateLinks.length) {
    throw new Error(`Duplicate standalone links: ${[...new Set(duplicateLinks)].join(', ')}`)
  }

  normalizedLinks.sort((left, right) => right.link.split('/').length - left.link.split('/').length)

  for (const entry of normalizedLinks) {
    const linkPath = path.resolve(releaseRoot, ...entry.link.split('/'))
    const targetPath = path.resolve(releaseRoot, ...entry.target.split('/'))
    assertInside(releaseRoot, linkPath, 'Link path')
    assertInside(releaseRoot, targetPath, 'Link target')

    if (!existsSync(targetPath)) {
      throw new Error(`Standalone link target is missing: ${entry.target}`)
    }

    rmSync(linkPath, { recursive: true, force: true })
    mkdirSync(path.dirname(linkPath), { recursive: true })
    const relativeTarget = path.relative(path.dirname(linkPath), targetPath)
    symlinkSync(relativeTarget, linkPath, 'dir')

    if (realpathSync(linkPath) !== realpathSync(targetPath)) {
      throw new Error(`Standalone link verification failed: ${entry.link}`)
    }
  }

  return normalizedLinks.length
}

function findSecretFiles(rootPath) {
  const found = []
  const pending = [rootPath]

  while (pending.length) {
    const directory = pending.pop()
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name)
      if (entry.name === '.env' || entry.name.startsWith('.env.')) {
        found.push(path.relative(rootPath, entryPath).replaceAll('\\', '/'))
        continue
      }
      if (entry.isDirectory() && !entry.isSymbolicLink()) pending.push(entryPath)
    }
  }

  return found
}

function assertRealDirectory(directoryPath, label) {
  if (!existsSync(directoryPath)) throw new Error(`${label} is missing: ${directoryPath}`)
  const stats = lstatSync(directoryPath)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error(`${label} must be a real directory: ${directoryPath}`)
  }
}

export function mergeRetainedStaticAssets(previousStaticRoot, candidateStaticRoot, options = {}) {
  assertRealDirectory(previousStaticRoot, 'Previous Next static assets')
  assertRealDirectory(candidateStaticRoot, 'Candidate Next static assets')

  const nowMs = options.nowMs ?? Date.now()
  const retentionMs = options.retentionMs ?? STATIC_ASSET_RETENTION_MS
  if (!Number.isFinite(nowMs) || !Number.isFinite(retentionMs) || retentionMs <= 0) {
    throw new Error('Static asset retention requires positive finite timing values')
  }

  const cutoffMs = nowMs - retentionMs
  const pending = [previousStaticRoot]
  const result = { copied: 0, alreadyPresent: 0, expired: 0 }

  while (pending.length) {
    const directory = pending.pop()
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const sourcePath = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) {
        throw new Error(`Static asset tree contains a symbolic link: ${sourcePath}`)
      }
      if (entry.isDirectory()) {
        pending.push(sourcePath)
        continue
      }
      if (!entry.isFile()) {
        throw new Error(`Static asset tree contains an unsupported entry: ${sourcePath}`)
      }

      const sourceStats = statSync(sourcePath)
      if (sourceStats.mtimeMs < cutoffMs) {
        result.expired += 1
        continue
      }

      const relativePath = path.relative(previousStaticRoot, sourcePath)
      const targetPath = path.resolve(candidateStaticRoot, relativePath)
      assertInside(candidateStaticRoot, targetPath, 'Retained static asset')
      if (existsSync(targetPath)) {
        const targetStats = lstatSync(targetPath)
        if (!targetStats.isFile() || targetStats.isSymbolicLink()) {
          throw new Error(`Candidate static asset conflicts with a non-file: ${targetPath}`)
        }
        result.alreadyPresent += 1
        continue
      }

      mkdirSync(path.dirname(targetPath), { recursive: true })
      copyFileSync(sourcePath, targetPath)
      utimesSync(targetPath, sourceStats.atime, sourceStats.mtime)
      result.copied += 1
    }
  }

  return result
}

export function extractNextStaticAssetUrls(html, pageUrl) {
  if (typeof html !== 'string' || typeof pageUrl !== 'string') {
    throw new Error('Static asset extraction requires HTML and a page URL')
  }
  const urls = []
  const seen = new Set()
  const assetPattern = /\b(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/giu
  for (const match of html.matchAll(assetPattern)) {
    const rawUrl = match[1].replaceAll('&amp;', '&')
    const absoluteUrl = new URL(rawUrl, pageUrl).href
    if (seen.has(absoluteUrl)) continue
    seen.add(absoluteUrl)
    urls.push(absoluteUrl)
  }
  if (!urls.length) throw new Error(`Deployment HTML has no Next static assets: ${pageUrl}`)
  return urls
}

export function inspectVersionedDeploymentHtml(html, pageUrl, expectedDeploymentId) {
  if (typeof expectedDeploymentId !== 'string' || !expectedDeploymentId) {
    throw new Error('Expected deployment id is required')
  }
  const documentDeploymentId = html.match(/\bdata-dpl-id=["']([^"']+)["']/iu)?.[1] ?? null
  if (documentDeploymentId && documentDeploymentId !== expectedDeploymentId) {
    throw new Error(
      `Deployment HTML has deployment id ${JSON.stringify(documentDeploymentId)}, expected ${JSON.stringify(expectedDeploymentId)}`,
    )
  }

  const staticAssetUrls = extractNextStaticAssetUrls(html, pageUrl)
  const mismatchedAssets = staticAssetUrls.filter((assetUrl) => (
    new URL(assetUrl).searchParams.get('dpl') !== expectedDeploymentId
  ))
  if (mismatchedAssets.length) {
    throw new Error(`Deployment HTML has static assets without deployment id ${expectedDeploymentId}`)
  }
  return { deploymentId: documentDeploymentId ?? expectedDeploymentId, staticAssetUrls }
}

function ensureSlotsRoot() {
  const user = run('id', ['-un']).stdout
  const group = run('id', ['-gn']).stdout
  run('sudo', slotsRootInstallArgs(user, group))
  assertRealDirectory(SLOTS_ROOT, 'Slots root')
}

function releaseMetadataPath(releaseRoot) {
  return path.join(releaseRoot, RELEASE_METADATA_FILE)
}

function readReleaseMetadata(releaseRoot, required = false) {
  const metadataPath = releaseMetadataPath(releaseRoot)
  if (!existsSync(metadataPath)) {
    if (required) throw new Error(`Release metadata is missing: ${metadataPath}`)
    return null
  }

  let metadata
  try {
    metadata = JSON.parse(readFileSync(metadataPath, 'utf8'))
  } catch (error) {
    throw new Error(`Release metadata is invalid: ${metadataPath}: ${error.message}`)
  }
  if (metadata?.version !== 1 || !SLOT_NAMES.includes(metadata.slot)) {
    throw new Error(`Release metadata has an unsupported shape: ${metadataPath}`)
  }
  assertReleaseId(metadata.releaseId)
  assertCommitHash(metadata.commit)
  if (path.resolve(releaseRoot) !== path.resolve(SLOTS_ROOT, metadata.slot)) {
    throw new Error(`Release metadata slot does not match its directory: ${metadataPath}`)
  }
  return metadata
}

function writeReleaseMetadata(releaseRoot, metadata) {
  if (metadata?.version !== 1 || !SLOT_NAMES.includes(metadata.slot)) {
    throw new Error('Refusing to write unsupported release metadata')
  }
  assertReleaseId(metadata.releaseId)
  assertCommitHash(metadata.commit)
  writeFileSync(releaseMetadataPath(releaseRoot), `${JSON.stringify(metadata, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'w',
  })
}

function currentDeploymentPath() {
  return existsSync(CURRENT_LINK) ? realpathSync(CURRENT_LINK) : null
}

function findSlotByReleaseId(releaseId) {
  assertReleaseId(releaseId)
  const matches = []
  for (const slot of SLOT_NAMES) {
    const slotRoot = path.join(SLOTS_ROOT, slot)
    if (!existsSync(slotRoot)) continue
    assertRealDirectory(slotRoot, `Slot ${slot}`)
    const metadata = readReleaseMetadata(slotRoot, true)
    if (metadata.releaseId === releaseId) matches.push({ slot, slotRoot, metadata })
  }
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one slot for release ${releaseId}, found ${matches.length}`)
  }
  return matches[0]
}

function assertMaterialFile(filePath, minimumBytes) {
  if (!existsSync(filePath) || !lstatSync(filePath).isFile() || lstatSync(filePath).size < minimumBytes) {
    throw new Error(`Required release file is missing or too small: ${filePath}`)
  }
}

function assertPreparedRelease(releaseRoot) {
  const appRoot = path.join(releaseRoot, APP_RELATIVE_PATH)
  assertMaterialFile(path.join(appRoot, 'server.js'), 1_000)
  assertMaterialFile(path.join(appRoot, DIST_DIR, 'BUILD_ID'), 5)
  assertMaterialFile(path.join(appRoot, 'public', 'sw.js'), 1_000)

  if (!existsSync(path.join(appRoot, DIST_DIR, 'static'))) {
    throw new Error(`Next static assets are missing: ${path.join(appRoot, DIST_DIR, 'static')}`)
  }

  const secretFiles = findSecretFiles(releaseRoot)
  if (secretFiles.length) {
    throw new Error(`Secret files entered the release: ${secretFiles.join(', ')}`)
  }

  const sharpProbe = run('/usr/local/bin/node', [
    '--require',
    'sharp',
    '-e',
    'if(process.platform!=="linux"||process.arch!=="x64")process.exit(41)',
  ], { cwd: appRoot })
  if (sharpProbe.status !== 0) throw new Error('Oracle Linux sharp runtime probe failed')

  return appRoot
}

export function parseJpegDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error('SEO image is not a JPEG')
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ])
  let offset = 2

  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }

    const marker = buffer[offset + 1]
    offset += 2
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) continue
    if (offset + 2 > buffer.length) break

    const segmentLength = buffer.readUInt16BE(offset)
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break
    if (startOfFrameMarkers.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      }
    }
    offset += segmentLength
  }

  throw new Error('JPEG dimensions could not be read')
}

async function fetchWithTimeout(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
  })
  return response
}

export async function probeStaticAssetUrls(assetUrls, options = {}) {
  if (!Array.isArray(assetUrls) || !assetUrls.length) {
    throw new Error('Static asset probe requires at least one URL')
  }
  const concurrency = options.concurrency ?? 8
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) {
    throw new Error(`Invalid static asset probe concurrency: ${concurrency}`)
  }

  let checked = 0
  let bytes = 0
  for (let offset = 0; offset < assetUrls.length; offset += concurrency) {
    const batch = assetUrls.slice(offset, offset + concurrency)
    await Promise.all(batch.map(async (assetUrl) => {
      const response = await fetchWithTimeout(assetUrl, { timeoutMs: 10_000 })
      if (!response.ok) {
        throw new Error(`Next static asset returned HTTP ${response.status}: ${assetUrl}`)
      }
      const body = await response.arrayBuffer()
      if (!body.byteLength) throw new Error(`Next static asset is empty: ${assetUrl}`)
      bytes += body.byteLength
      checked += 1
    }))
  }
  return { checked, bytes }
}

async function waitForHttp(url, attempts = 40) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, { timeoutMs: 3_000 })
      if (response.status >= 200 && response.status < 500) return response
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Server did not become ready at ${url}: ${lastError?.message ?? 'unknown error'}`)
}

async function readSeoImage(url) {
  const response = await fetchWithTimeout(url)
  if (!response.ok) throw new Error(`SEO image returned HTTP ${response.status}: ${url}`)
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.startsWith('image/jpeg')) {
    throw new Error(`SEO image has unexpected content type ${contentType}: ${url}`)
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  const dimensions = parseJpegDimensions(bytes)
  if (dimensions.width !== 800 || dimensions.height !== 800) {
    throw new Error(`SEO image is ${dimensions.width}x${dimensions.height}, expected 800x800`)
  }
  return {
    bytes: bytes.length,
    hash: createHash('sha256').update(bytes).digest('hex'),
    dimensions,
  }
}

export async function verifyApplication(
  port,
  probeSlug,
  probeToken = Date.now().toString(36),
  expectedDeploymentId = null,
) {
  const origin = `http://127.0.0.1:${port}`
  const pageUrl = `${origin}/celeb/${encodeURIComponent(probeSlug)}`
  await waitForHttp(pageUrl)

  const page = await fetchWithTimeout(pageUrl)
  if (!page.ok) throw new Error(`Canary page returned HTTP ${page.status}: ${pageUrl}`)
  const html = await page.text()
  if (!html.includes(`/seo-image/celeb/${probeSlug}`)) {
    throw new Error(`Canary page does not declare its SEO image: ${probeSlug}`)
  }
  const deployment = expectedDeploymentId
    ? inspectVersionedDeploymentHtml(html, pageUrl, expectedDeploymentId)
    : {
        deploymentId: null,
        staticAssetUrls: extractNextStaticAssetUrls(html, pageUrl),
      }
  const staticAssets = await probeStaticAssetUrls(deployment.staticAssetUrls)

  const actual = await readSeoImage(
    `${origin}/seo-image/celeb/${encodeURIComponent(probeSlug)}?locale=ko&v=deploy-${probeToken}`,
  )
  const fallback = await readSeoImage(
    `${origin}/seo-image/celeb/__missing-deploy-probe__?locale=ko&v=deploy-${probeToken}`,
  )
  if (actual.hash === fallback.hash) {
    throw new Error(`Published celeb ${probeSlug} returned the fallback SEO image`)
  }

  return {
    pageStatus: page.status,
    deploymentId: deployment.deploymentId,
    staticAssets,
    actual: { bytes: actual.bytes, hash: actual.hash.slice(0, 16), ...actual.dimensions },
    fallback: { bytes: fallback.bytes, hash: fallback.hash.slice(0, 16), ...fallback.dimensions },
  }
}

export function inspectExploreWarmupHtml(html, pageUrl, expectedDeploymentId) {
  const deployment = inspectVersionedDeploymentHtml(html, pageUrl, expectedDeploymentId)
  if (!html.includes('href="/explore/ranking"')) {
    throw new Error('Explore warmup page is missing the ranking link')
  }
  if (!/누적 조회 [\d,]+회/u.test(html)) {
    throw new Error('Explore warmup page is missing rendered profile cards')
  }
  return { deploymentId: deployment.deploymentId }
}

async function warmExplorePage(port, expectedDeploymentId, passes = 2) {
  const pageUrl = `http://127.0.0.1:${port}/explore`
  const runs = []

  for (let pass = 1; pass <= passes; pass += 1) {
    const startedAt = Date.now()
    const response = await fetchWithTimeout(pageUrl, {
      headers: { 'user-agent': 'feelandnote-deploy-warmup/1.0' },
      timeoutMs: 45_000,
    })
    if (!response.ok) throw new Error(`Explore warmup returned HTTP ${response.status}: ${pageUrl}`)
    const html = await response.text()
    const inspection = inspectExploreWarmupHtml(html, pageUrl, expectedDeploymentId)
    runs.push({
      pass,
      status: response.status,
      durationMs: Date.now() - startedAt,
      deploymentId: inspection.deploymentId,
    })
  }

  const finalRun = runs.at(-1)
  if (!finalRun || finalRun.durationMs > 5_000) {
    throw new Error(`Explore warmup cache verification took ${finalRun?.durationMs ?? 'unknown'}ms`)
  }

  return { url: pageUrl, runs }
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    socket.setTimeout(1_000)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    const finish = () => {
      socket.destroy()
      resolve(false)
    }
    socket.once('error', finish)
    socket.once('timeout', finish)
  })
}

function canaryUnitName(releaseId) {
  return `feelandnote-web-canary-${releaseId}.service`
}

async function readActiveCaddyConfig() {
  const response = await fetchWithTimeout(`${CADDY_ADMIN_URL}/config/`, { timeoutMs: 5_000 })
  if (!response.ok) {
    throw new Error(`Caddy admin config returned HTTP ${response.status}`)
  }
  const config = await response.json()
  inspectCaddyProxyPort(config)
  return config
}

async function loadActiveCaddyConfig(config, expectedPort) {
  const response = await fetchWithTimeout(`${CADDY_ADMIN_URL}/load`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(config),
    timeoutMs: 10_000,
  })
  if (!response.ok) {
    const detail = (await response.text()).trim()
    throw new Error(`Caddy config load returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
  }

  const active = await readActiveCaddyConfig()
  const activePort = inspectCaddyProxyPort(active)
  if (activePort !== expectedPort) {
    throw new Error(`Caddy routes to port ${activePort}, expected ${expectedPort}`)
  }
  return activePort
}

function canaryServiceState(releaseId) {
  return run('sudo', ['systemctl', 'is-active', canaryUnitName(releaseId)], {
    allowFailure: true,
  }).stdout
}

function assertCanaryActive(releaseId) {
  const state = canaryServiceState(releaseId)
  if (state !== 'active') {
    throw new Error(`${canaryUnitName(releaseId)} is not active: ${state || 'unknown'}`)
  }
}

async function stopCanary(releaseId, port) {
  assertBridgePort(port)
  const unit = canaryUnitName(releaseId)
  const activeConfig = await readActiveCaddyConfig()
  if (inspectCaddyProxyPort(activeConfig) === port) {
    throw new Error(`Refusing to stop ${unit} while Caddy routes production traffic to port ${port}`)
  }
  run('sudo', ['systemctl', 'stop', unit], { allowFailure: true })
  const stoppedState = canaryServiceState(releaseId)
  if (stoppedState === 'active' || stoppedState === 'activating' || stoppedState === 'deactivating') {
    throw new Error(`${unit} did not stop: ${stoppedState}`)
  }
  run('sudo', ['systemctl', 'reset-failed', unit], { allowFailure: true })
  return stoppedState || 'inactive'
}

async function runCanary(releaseId, port, probeSlug) {
  assertBridgePort(port)
  await stopCanary(releaseId, port)
  if (await canConnect(port)) throw new Error(`Canary port ${port} is already in use`)

  const { slot, slotRoot, metadata } = findSlotByReleaseId(releaseId)
  const currentPath = currentDeploymentPath()
  if (currentPath && realpathSync(slotRoot) === currentPath) {
    throw new Error(`Refusing to run a canary from the active ${slot} slot`)
  }
  const appRoot = assertPreparedRelease(slotRoot)
  const unit = canaryUnitName(releaseId)

  let keepRunning = false
  try {
    run('sudo', [
      'systemd-run',
      `--unit=${unit}`,
      '--collect',
      '--property=Type=simple',
      '--property=User=ubuntu',
      '--property=Group=ubuntu',
      `--property=WorkingDirectory=${appRoot}`,
      `--property=EnvironmentFile=${ENV_FILE}`,
      '--property=NoNewPrivileges=true',
      '--property=PrivateTmp=true',
      '--property=MemoryHigh=700M',
      '--property=MemoryMax=850M',
      '--property=Restart=on-failure',
      '--property=RestartSec=2s',
      '--property=TimeoutStopSec=15s',
      '--setenv=NODE_ENV=production',
      `--setenv=PORT=${port}`,
      '--setenv=NODE_OPTIONS=--max-old-space-size=512',
      '/usr/local/bin/node',
      'server.js',
    ])

    const probes = await verifyApplication(port, probeSlug, releaseId, releaseId)
    const exploreWarmup = await warmExplorePage(port, releaseId)
    keepRunning = true
    return {
      unit,
      port,
      slot,
      releaseId: metadata.releaseId,
      probes,
      exploreWarmup,
      keptRunningForTrafficBridge: true,
    }
  } catch (error) {
    const logs = run('sudo', ['journalctl', '-u', unit, '-n', '80', '--no-pager'], {
      allowFailure: true,
    }).stdout
    throw new Error(`${error.message}${logs ? `\nCanary logs:\n${logs}` : ''}`)
  } finally {
    if (!keepRunning) await stopCanary(releaseId, port)
  }
}

function switchCurrentLink(targetPath, releaseId) {
  const temporaryLink = `/opt/feelandnote/web/.current-${releaseId}`
  run('sudo', ['ln', '-sfn', targetPath, temporaryLink])
  run('sudo', ['mv', '-Tf', temporaryLink, CURRENT_LINK])
  if (realpathSync(CURRENT_LINK) !== realpathSync(targetPath)) {
    throw new Error(`Current release link did not switch to ${targetPath}`)
  }
}

async function waitForServiceActive(attempts = 40) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const state = run('sudo', ['systemctl', 'is-active', SERVICE_NAME], { allowFailure: true })
    if (state.stdout === 'active') return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`${SERVICE_NAME} did not become active`)
}

async function restartPrimaryApplication(releasePath, linkId, probeSlug, expectedDeploymentId) {
  if (currentDeploymentPath() !== realpathSync(releasePath)) {
    switchCurrentLink(releasePath, linkId)
  }
  run('sudo', ['systemctl', 'restart', SERVICE_NAME])
  await waitForServiceActive()
  const probes = await verifyApplication(
    PRIMARY_PORT,
    probeSlug,
    linkId,
    expectedDeploymentId,
  )
  const exploreWarmup = expectedDeploymentId
    ? await warmExplorePage(PRIMARY_PORT, expectedDeploymentId, 1)
    : null
  return { probes, exploreWarmup }
}

async function waitForTrafficDrain() {
  await new Promise((resolve) => setTimeout(resolve, TRAFFIC_DRAIN_MS))
}

async function recoverPrimaryRelease({
  releasePath,
  linkId,
  expectedDeploymentId,
  bridgeExpectedDeploymentId,
  probeSlug,
  originalCaddyConfig,
  bridgePort,
}) {
  const failures = []
  let activePort = null
  try {
    activePort = inspectCaddyProxyPort(await readActiveCaddyConfig())
  } catch (error) {
    failures.push(`Caddy state check failed: ${error.message}`)
  }

  if (activePort === PRIMARY_PORT) {
    try {
      await verifyApplication(
        bridgePort,
        probeSlug,
        `recovery-${linkId}`,
        bridgeExpectedDeploymentId,
      )
      await loadActiveCaddyConfig(createBridgeCaddyConfig(originalCaddyConfig, bridgePort), bridgePort)
      await waitForTrafficDrain()
      activePort = bridgePort
    } catch (error) {
      try {
        activePort = inspectCaddyProxyPort(await readActiveCaddyConfig())
      } catch {
        // 아래 실패 보고가 원래 bridge 복구 오류를 보존한다.
      }
      if (activePort !== bridgePort) {
        failures.push(`Traffic bridge recovery failed: ${error.message}`)
      }
    }
  }

  let primary = null
  if (activePort === bridgePort) {
    try {
      primary = await restartPrimaryApplication(
        releasePath,
        linkId,
        probeSlug,
        expectedDeploymentId,
      )
    } catch (error) {
      failures.push(`Primary recovery failed: ${error.message}`)
    }
  } else if (activePort !== null) {
    failures.push(`Caddy routes to unexpected port ${activePort}`)
  }

  if (primary && activePort === bridgePort) {
    try {
      await loadActiveCaddyConfig(originalCaddyConfig, PRIMARY_PORT)
      activePort = PRIMARY_PORT
    } catch (error) {
      try {
        activePort = inspectCaddyProxyPort(await readActiveCaddyConfig())
      } catch {
        // 아래 실패 보고가 원래 Caddy 복구 오류를 보존한다.
      }
      if (activePort !== PRIMARY_PORT) {
        failures.push(`Caddy recovery failed: ${error.message}`)
      }
    }
  }

  return { failures, activePort, primary }
}

async function transitionPrimaryRelease({
  operation,
  targetPath,
  targetLinkId,
  targetExpectedDeploymentId,
  fallbackPath,
  fallbackLinkId,
  fallbackExpectedDeploymentId,
  bridgeExpectedDeploymentId,
  bridgePort,
  probeSlug,
}) {
  const originalCaddyConfig = await readActiveCaddyConfig()
  if (inspectCaddyProxyPort(originalCaddyConfig) !== PRIMARY_PORT) {
    throw new Error(`Caddy is not on the primary port ${PRIMARY_PORT}`)
  }
  const bridgeCaddyConfig = createBridgeCaddyConfig(originalCaddyConfig, bridgePort)
  let primaryRestartAttempted = false
  let primary = null
  try {
    await loadActiveCaddyConfig(bridgeCaddyConfig, bridgePort)
    await waitForTrafficDrain()

    primaryRestartAttempted = true
    primary = await restartPrimaryApplication(
      targetPath,
      targetLinkId,
      probeSlug,
      targetExpectedDeploymentId,
    )
    await loadActiveCaddyConfig(originalCaddyConfig, PRIMARY_PORT)
    return {
      primary,
      trafficBridge: {
        port: bridgePort,
        drainMs: TRAFFIC_DRAIN_MS,
        restoredToPrimaryPort: true,
      },
    }
  } catch (error) {
    let activePort = null
    try {
      activePort = inspectCaddyProxyPort(await readActiveCaddyConfig())
    } catch {
      // 복구 함수가 Caddy 상태 확인 실패를 구체적으로 보고한다.
    }

    if (primary && activePort === PRIMARY_PORT) {
      return {
        primary,
        trafficBridge: {
          port: bridgePort,
          drainMs: TRAFFIC_DRAIN_MS,
          restoredToPrimaryPort: true,
          restoreVerificationRecovered: true,
        },
      }
    }

    let linkChanged = true
    try {
      linkChanged = currentDeploymentPath() !== fallbackPath
    } catch {
      // 링크 상태가 불명확하면 현재 release가 안전하다고 단정하지 않고 복구를 시도한다.
    }
    if (activePort === PRIMARY_PORT && !primaryRestartAttempted && !linkChanged) {
      throw new Error(`${operation} failed before traffic switched; the current release is still live: ${error.message}`)
    }

    const recovery = await recoverPrimaryRelease({
      releasePath: fallbackPath,
      linkId: fallbackLinkId,
      expectedDeploymentId: fallbackExpectedDeploymentId,
      bridgeExpectedDeploymentId,
      probeSlug,
      originalCaddyConfig,
      bridgePort,
    })
    if (recovery.failures.length) {
      throw new Error(
        `${operation} failed; recovery was incomplete (${recovery.failures.join('; ')}). `
        + `The traffic bridge was left running when still selected: ${error.message}`,
      )
    }
    throw new Error(`${operation} failed and the previous release was restored without a traffic gap: ${error.message}`)
  }
}

async function activateRelease(releaseId, bridgePort, probeSlug) {
  assertBridgePort(bridgePort)
  assertCanaryActive(releaseId)
  const { slot, slotRoot, metadata } = findSlotByReleaseId(releaseId)
  assertPreparedRelease(slotRoot)
  const previousRelease = currentDeploymentPath()
  if (!previousRelease) throw new Error('Current deployment link is missing')
  const previousTarget = deploymentTargetForPath(previousRelease)
  const previousSlot = slotNameForPath(previousRelease)
  const previousMetadata = previousSlot ? readReleaseMetadata(previousRelease, true) : null
  if (realpathSync(slotRoot) === previousRelease) {
    throw new Error(`Release is already active in the ${slot} slot`)
  }

  const transition = await transitionPrimaryRelease({
    operation: 'Activation',
    targetPath: slotRoot,
    targetLinkId: releaseId,
    targetExpectedDeploymentId: metadata.releaseId,
    fallbackPath: previousRelease,
    fallbackLinkId: `rollback-${releaseId}`.slice(0, 79),
    fallbackExpectedDeploymentId: previousMetadata?.releaseId ?? null,
    bridgeExpectedDeploymentId: releaseId,
    bridgePort,
    probeSlug,
  })

  return {
    previousRelease,
    previousTarget,
    currentRelease: metadata.releaseId,
    currentCommit: metadata.commit,
    currentPath: realpathSync(CURRENT_LINK),
    currentSlot: slot,
    probes: transition.primary.probes,
    exploreWarmup: transition.primary.exploreWarmup,
    trafficBridge: transition.trafficBridge,
  }
}

async function rollbackRelease(target, releaseId, bridgePort, probeSlug) {
  assertBridgePort(bridgePort)
  assertCanaryActive(releaseId)
  const sourcePath = currentDeploymentPath()
  if (!sourcePath) throw new Error('Current deployment link is missing')
  const sourceSlot = slotNameForPath(sourcePath)
  const sourceMetadata = sourceSlot ? readReleaseMetadata(sourcePath, true) : null
  if (sourceMetadata && sourceMetadata.releaseId !== releaseId) {
    throw new Error(`Rollback bridge release ${releaseId} is not current (${sourceMetadata.releaseId})`)
  }

  const targetPath = resolveDeploymentTarget(target)
  assertPreparedRelease(targetPath)
  const targetSlot = slotNameForPath(targetPath)
  const metadata = targetSlot ? readReleaseMetadata(targetPath, true) : null
  if (realpathSync(targetPath) === sourcePath) {
    throw new Error(`Rollback target is already active: ${target}`)
  }

  await verifyApplication(bridgePort, probeSlug, releaseId, releaseId)
  const transition = await transitionPrimaryRelease({
    operation: 'Rollback',
    targetPath,
    targetLinkId: `rollback-${target}`.slice(0, 79),
    targetExpectedDeploymentId: metadata?.releaseId ?? null,
    fallbackPath: sourcePath,
    fallbackLinkId: `rollback-failed-${releaseId}`.slice(0, 79),
    fallbackExpectedDeploymentId: sourceMetadata?.releaseId ?? null,
    bridgeExpectedDeploymentId: releaseId,
    bridgePort,
    probeSlug,
  })

  return {
    currentRelease: metadata?.releaseId ?? path.basename(targetPath),
    currentCommit: metadata?.commit ?? null,
    currentPath: realpathSync(CURRENT_LINK),
    currentSlot: targetSlot,
    probes: transition.primary.probes,
    trafficBridge: transition.trafficBridge,
  }
}

function prepareRelease(releaseId, commit, archivePath, manifestPath) {
  assertReleaseId(releaseId)
  assertCommitHash(commit)
  if (!existsSync(archivePath) || !existsSync(manifestPath)) {
    throw new Error('Uploaded archive or link manifest is missing')
  }

  ensureSlotsRoot()
  const currentPath = currentDeploymentPath()
  if (currentPath) deploymentTargetForPath(currentPath)
  const currentSlot = slotNameForPath(currentPath)
  if (currentSlot) {
    const currentMetadata = readReleaseMetadata(currentPath, true)
    if (currentMetadata.releaseId === releaseId) {
      throw new Error(`Release ${releaseId} is already active in the ${currentSlot} slot`)
    }
  }
  const slot = chooseInactiveSlot(currentPath)
  const slotRoot = path.join(SLOTS_ROOT, slot)
  const stagingRoot = path.join(SLOTS_ROOT, `.prepare-${slot}`)
  if (currentPath && existsSync(slotRoot) && realpathSync(slotRoot) === currentPath) {
    throw new Error(`Refusing to replace the active ${slot} slot`)
  }
  if (existsSync(stagingRoot)) {
    assertRealDirectory(stagingRoot, 'Staging release')
    rmSync(stagingRoot, { recursive: true, force: true })
  }

  mkdirSync(stagingRoot, { recursive: false })
  try {
    run('tar', ['-xzf', archivePath, '-C', stagingRoot])
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const restoredLinks = restoreStandaloneLinks(stagingRoot, manifest)
    assertPreparedRelease(stagingRoot)
    const retainedStaticAssets = currentPath
      ? mergeRetainedStaticAssets(
          path.join(currentPath, APP_RELATIVE_PATH, DIST_DIR, 'static'),
          path.join(stagingRoot, APP_RELATIVE_PATH, DIST_DIR, 'static'),
        )
      : { copied: 0, alreadyPresent: 0, expired: 0 }

    if (existsSync(slotRoot)) {
      assertRealDirectory(slotRoot, `Inactive ${slot} slot`)
      rmSync(slotRoot, { recursive: true, force: true })
    }
    renameSync(stagingRoot, slotRoot)
    writeReleaseMetadata(slotRoot, { version: 1, slot, releaseId, commit })
    readReleaseMetadata(slotRoot, true)
    return { slot, slotRoot, releaseId, commit, restoredLinks, retainedStaticAssets }
  } catch (error) {
    if (existsSync(stagingRoot)) rmSync(stagingRoot, { recursive: true, force: true })
    throw error
  }
}

function finalizeRelease(releaseId, previousTarget, previousCommit) {
  const active = findSlotByReleaseId(releaseId)
  const currentPath = currentDeploymentPath()
  if (!currentPath || currentPath !== realpathSync(active.slotRoot)) {
    throw new Error(`Release ${releaseId} is not the active deployment`)
  }

  let migratedLegacyRollback = null
  if (previousTarget && !SLOT_NAMES.includes(previousTarget)) {
    assertCommitHash(previousCommit)
    const legacyRollback = resolveDeploymentTarget(previousTarget)
    const rollbackSlot = active.slot === 'blue' ? 'green' : 'blue'
    const rollbackRoot = path.join(SLOTS_ROOT, rollbackSlot)
    if (existsSync(legacyRollback)) {
      assertPreparedRelease(legacyRollback)
      if (existsSync(rollbackRoot)) {
        if (realpathSync(rollbackRoot) === currentPath) {
          throw new Error(`Refusing to replace the active ${rollbackSlot} slot during migration`)
        }
        assertRealDirectory(rollbackRoot, `Rollback ${rollbackSlot} slot`)
        rmSync(rollbackRoot, { recursive: true, force: true })
      }
      writeReleaseMetadata(legacyRollback, {
        version: 1,
        slot: rollbackSlot,
        releaseId: previousTarget,
        commit: previousCommit,
      })
      renameSync(legacyRollback, rollbackRoot)
    } else {
      assertRealDirectory(rollbackRoot, `Migrated rollback ${rollbackSlot} slot`)
      const rollbackMetadata = readReleaseMetadata(rollbackRoot, true)
      if (rollbackMetadata.releaseId !== previousTarget || rollbackMetadata.commit !== previousCommit) {
        throw new Error(`Migrated rollback metadata does not match ${previousTarget}`)
      }
    }
    readReleaseMetadata(rollbackRoot, true)
    migratedLegacyRollback = { slot: rollbackSlot, releaseId: previousTarget }
  }

  let removedLegacyReleases = 0
  if (existsSync(LEGACY_RELEASES_ROOT)) {
    assertRealDirectory(LEGACY_RELEASES_ROOT, 'Legacy releases root')
    const legacyEntries = readdirSync(LEGACY_RELEASES_ROOT, { withFileTypes: true })
    for (const entry of legacyEntries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) {
        throw new Error(`Unexpected entry in legacy releases root: ${entry.name}`)
      }
      assertReleaseId(entry.name)
      assertRealDirectory(path.join(LEGACY_RELEASES_ROOT, entry.name), 'Legacy release')
    }
    for (const entry of legacyEntries) {
      rmSync(path.join(LEGACY_RELEASES_ROOT, entry.name), { recursive: true, force: true })
      removedLegacyReleases += 1
    }
    if (readdirSync(LEGACY_RELEASES_ROOT).length !== 0) {
      throw new Error(`Legacy releases root is not empty: ${LEGACY_RELEASES_ROOT}`)
    }
    run('sudo', legacyReleasesRootRemoveArgs())
  }

  return {
    currentSlot: active.slot,
    currentRelease: active.metadata.releaseId,
    rollback: migratedLegacyRollback,
    removedLegacyReleases,
  }
}

function status() {
  const service = run('sudo', ['systemctl', 'is-active', SERVICE_NAME], { allowFailure: true }).stdout
  const currentPath = currentDeploymentPath()
  const currentSlot = slotNameForPath(currentPath)
  const metadata = currentSlot ? readReleaseMetadata(currentPath, true) : null
  return {
    service,
    currentRelease: metadata?.releaseId ?? currentPath,
    currentCommit: metadata?.commit ?? null,
    currentPath,
    currentSlot,
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2)
  const releaseId = argumentValue(args, '--release-id')
  if (command !== 'status') assertReleaseId(releaseId)

  let result
  if (command === 'status') {
    result = status()
  } else if (command === 'prepare') {
    result = prepareRelease(
      releaseId,
      argumentValue(args, '--commit'),
      argumentValue(args, '--archive'),
      argumentValue(args, '--manifest'),
    )
  } else if (command === 'canary') {
    result = await runCanary(
      releaseId,
      Number(argumentValue(args, '--port')),
      argumentValue(args, '--probe-slug') ?? 'bill-gates',
    )
  } else if (command === 'activate') {
    result = await activateRelease(
      releaseId,
      Number(argumentValue(args, '--port')),
      argumentValue(args, '--probe-slug') ?? 'bill-gates',
    )
  } else if (command === 'rollback') {
    result = await rollbackRelease(
      argumentValue(args, '--target'),
      releaseId,
      Number(argumentValue(args, '--port')),
      argumentValue(args, '--probe-slug') ?? 'bill-gates',
    )
  } else if (command === 'finalize') {
    result = finalizeRelease(
      releaseId,
      argumentValue(args, '--previous-target'),
      argumentValue(args, '--previous-commit'),
    )
  } else if (command === 'stop-canary') {
    const port = Number(argumentValue(args, '--port'))
    const state = await stopCanary(releaseId, port)
    result = { stopped: canaryUnitName(releaseId), state }
  } else {
    throw new Error(`Unknown command: ${JSON.stringify(command)}`)
  }

  process.stdout.write(`${JSON.stringify(result)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(`[oracle-web-remote] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
