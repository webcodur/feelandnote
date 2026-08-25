import { createHash } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const RELEASES_ROOT = '/opt/feelandnote/web/releases'
const CURRENT_LINK = '/opt/feelandnote/web/current'
const SERVICE_NAME = 'feelandnote-web.service'
const ENV_FILE = '/etc/feelandnote/web.env'
const APP_RELATIVE_PATH = 'sw/web'
const DIST_DIR = '.next-verify'

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

export async function verifyApplication(port, probeSlug, probeToken = Date.now().toString(36)) {
  const origin = `http://127.0.0.1:${port}`
  const pageUrl = `${origin}/celeb/${encodeURIComponent(probeSlug)}`
  await waitForHttp(pageUrl)

  const page = await fetchWithTimeout(pageUrl)
  if (!page.ok) throw new Error(`Canary page returned HTTP ${page.status}: ${pageUrl}`)
  const html = await page.text()
  if (!html.includes(`/seo-image/celeb/${probeSlug}`)) {
    throw new Error(`Canary page does not declare its SEO image: ${probeSlug}`)
  }

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
    actual: { bytes: actual.bytes, hash: actual.hash.slice(0, 16), ...actual.dimensions },
    fallback: { bytes: fallback.bytes, hash: fallback.hash.slice(0, 16), ...fallback.dimensions },
  }
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

function stopCanary(releaseId) {
  const unit = canaryUnitName(releaseId)
  run('sudo', ['systemctl', 'stop', unit], { allowFailure: true })
  run('sudo', ['systemctl', 'reset-failed', unit], { allowFailure: true })
}

async function runCanary(releaseId, port, probeSlug) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 3000) {
    throw new Error(`Unsafe canary port: ${port}`)
  }
  if (await canConnect(port)) throw new Error(`Canary port ${port} is already in use`)

  const releaseRoot = path.join(RELEASES_ROOT, releaseId)
  const appRoot = assertPreparedRelease(releaseRoot)
  const unit = canaryUnitName(releaseId)

  stopCanary(releaseId)
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
      '--setenv=NODE_ENV=production',
      `--setenv=PORT=${port}`,
      '--setenv=NODE_OPTIONS=--max-old-space-size=512',
      '/usr/local/bin/node',
      'server.js',
    ])

    const probes = await verifyApplication(port, probeSlug, releaseId)
    return { unit, port, probes }
  } catch (error) {
    const logs = run('sudo', ['journalctl', '-u', unit, '-n', '80', '--no-pager'], {
      allowFailure: true,
    }).stdout
    throw new Error(`${error.message}${logs ? `\nCanary logs:\n${logs}` : ''}`)
  } finally {
    stopCanary(releaseId)
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

async function activateRelease(releaseId, probeSlug) {
  const releaseRoot = path.join(RELEASES_ROOT, releaseId)
  assertPreparedRelease(releaseRoot)
  const previousRelease = realpathSync(CURRENT_LINK)
  if (!previousRelease.startsWith(`${RELEASES_ROOT}${path.sep}`)) {
    throw new Error(`Current release is outside ${RELEASES_ROOT}: ${previousRelease}`)
  }
  if (realpathSync(releaseRoot) === previousRelease) {
    throw new Error(`Release is already active: ${releaseRoot}`)
  }

  let switched = false
  try {
    switchCurrentLink(releaseRoot, releaseId)
    switched = true
    run('sudo', ['systemctl', 'restart', SERVICE_NAME])
    await waitForServiceActive()
    const probes = await verifyApplication(3000, probeSlug, releaseId)
    return { previousRelease, currentRelease: realpathSync(CURRENT_LINK), probes }
  } catch (error) {
    if (switched) {
      const rollbackId = `rollback-${releaseId}`.slice(0, 79)
      switchCurrentLink(previousRelease, rollbackId)
      run('sudo', ['systemctl', 'restart', SERVICE_NAME], { allowFailure: true })
      await waitForServiceActive().catch(() => undefined)
    }
    throw new Error(`Activation failed and rollback was attempted: ${error.message}`)
  }
}

async function rollbackRelease(targetReleaseId, probeSlug) {
  assertReleaseId(targetReleaseId)
  const targetRelease = path.join(RELEASES_ROOT, targetReleaseId)
  assertPreparedRelease(targetRelease)
  switchCurrentLink(targetRelease, `rollback-${targetReleaseId}`.slice(0, 79))
  run('sudo', ['systemctl', 'restart', SERVICE_NAME])
  await waitForServiceActive()
  const probes = await verifyApplication(3000, probeSlug, `rollback-${targetReleaseId}`)
  return { currentRelease: realpathSync(CURRENT_LINK), probes }
}

function prepareRelease(releaseId, archivePath, manifestPath) {
  const releaseRoot = path.join(RELEASES_ROOT, releaseId)
  if (existsSync(releaseRoot)) throw new Error(`Release already exists: ${releaseRoot}`)
  if (!existsSync(archivePath) || !existsSync(manifestPath)) {
    throw new Error('Uploaded archive or link manifest is missing')
  }

  mkdirSync(releaseRoot, { recursive: false })
  try {
    run('tar', ['-xzf', archivePath, '-C', releaseRoot])
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const restoredLinks = restoreStandaloneLinks(releaseRoot, manifest)
    assertPreparedRelease(releaseRoot)
    return { releaseRoot, restoredLinks }
  } catch (error) {
    rmSync(releaseRoot, { recursive: true, force: true })
    throw error
  }
}

function status() {
  const service = run('sudo', ['systemctl', 'is-active', SERVICE_NAME], { allowFailure: true }).stdout
  return {
    service,
    currentRelease: existsSync(CURRENT_LINK) ? realpathSync(CURRENT_LINK) : null,
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
      argumentValue(args, '--probe-slug') ?? 'bill-gates',
    )
  } else if (command === 'rollback') {
    result = await rollbackRelease(
      argumentValue(args, '--target-release-id'),
      argumentValue(args, '--probe-slug') ?? 'bill-gates',
    )
  } else if (command === 'stop-canary') {
    stopCanary(releaseId)
    result = { stopped: canaryUnitName(releaseId) }
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
