import { createHash } from 'node:crypto'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  classifyCloudflarePurgeImpact,
  createCloudflarePurgePlan,
} from './lib/cloudflare-purge-impact.mjs'
import {
  createBridgeCaddyConfig,
  extractNextStaticAssetUrls,
  inspectCaddyProxyPort,
  parseJpegDimensions,
  probeStaticAssetUrls,
  PRIMARY_PORT,
} from './lib/oracle-web-remote.mjs'

const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WEB_RELATIVE_PATH = 'sw/web'
const DIST_DIR = '.next-verify'
const PRODUCTION_SITE_URL = 'https://feelandnote.com'
const DEFAULT_HOST = 'ubuntu@158.179.194.105'
const DEFAULT_CANARY_PORT = 3100
const EXECUTE_CONFIRMATION = 'DEPLOY-FEELANDNOTE-WEB'

const HELP = `Usage:
  pnpm deploy:web:oracle
  pnpm deploy:web:oracle -- --package-only [--ref <git-ref>]
  pnpm deploy:web:oracle -- --execute --confirm ${EXECUTE_CONFIRMATION} [options]

Options:
  --ref <git-ref>                 committed source to deploy (default: HEAD)
  --release-id <id>               safe release directory name
  --canary-port <port>            verified traffic-bridge port (default: 3100)
  --probe-slug <slug>             published celeb used by canary (default: bill-gates)
  --purge-scopes <scope[,scope]>  explicit Cloudflare scopes when inference is blocked
  --allow-unpushed                allow a commit absent from remote branches (explicit approval only)
  --keep-artifacts                preserve the local archive after packaging or deployment
`

function resolvePnpmEntrypoint() {
  const candidates = [
    path.join(path.dirname(process.execPath), 'node_modules', 'pnpm', 'bin', 'pnpm.mjs'),
    process.env.PNPM_HOME
      ? path.join(process.env.PNPM_HOME, 'node_modules', 'pnpm', 'bin', 'pnpm.mjs')
      : null,
  ].filter(Boolean)
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) throw new Error('pnpm Node entrypoint could not be resolved on Windows')
  return found
}

function run(command, args, options = {}) {
  const actualCommand = process.platform === 'win32' && command === 'pnpm'
    ? process.execPath
    : command
  const actualArgs = process.platform === 'win32' && command === 'pnpm'
    ? [resolvePnpmEntrypoint(), ...args]
    : args
  const result = spawnSync(actualCommand, actualArgs, {
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

function hasFlag(args, name) {
  return args.includes(name)
}

function argumentValue(args, name) {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

function parseArguments(args) {
  const selectedModes = [
    hasFlag(args, '--plan') ? 'plan' : null,
    hasFlag(args, '--package-only') ? 'package' : null,
    hasFlag(args, '--execute') ? 'execute' : null,
  ].filter(Boolean)
  if (selectedModes.length > 1) throw new Error('Select only one deployment mode')

  const sshKey = argumentValue(args, '--ssh-key')
    ?? path.join(process.env.USERPROFILE ?? '', '.ssh', 'feelandnote_oracle')

  return {
    mode: selectedModes[0] ?? 'plan',
    ref: argumentValue(args, '--ref') ?? 'HEAD',
    releaseId: argumentValue(args, '--release-id'),
    host: argumentValue(args, '--host') ?? DEFAULT_HOST,
    sshKey,
    canaryPort: Number(argumentValue(args, '--canary-port') ?? DEFAULT_CANARY_PORT),
    probeSlug: argumentValue(args, '--probe-slug') ?? 'bill-gates',
    confirmation: argumentValue(args, '--confirm') ?? '',
    purgeScopes: argumentValue(args, '--purge-scopes')
      ?.split(',')
      .map((scope) => scope.trim())
      .filter(Boolean),
    allowUnpushed: hasFlag(args, '--allow-unpushed'),
    keepArtifacts: hasFlag(args, '--keep-artifacts'),
  }
}

function assertSafeReleaseId(releaseId) {
  if (!/^[a-z0-9][a-z0-9-]{7,79}$/u.test(releaseId)) {
    throw new Error(`Unsafe release id: ${releaseId}`)
  }
}

function timestampUtc() {
  return new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, 'Z').toLowerCase()
}

function resolveCommit(repoRoot, ref) {
  return run('git', ['rev-parse', '--verify', `${ref}^{commit}`], { cwd: repoRoot }).stdout
}

function resolveDefaultReleaseId(repoRoot, commit) {
  const shortHash = run('git', ['rev-parse', '--short=8', commit], { cwd: repoRoot }).stdout
  return `${shortHash}-web-${timestampUtc()}`
}

function sshOptions(sshKey) {
  if (!sshKey || !existsSync(sshKey)) throw new Error(`Oracle SSH key is missing: ${sshKey}`)
  return ['-i', sshKey, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10']
}

function runSsh(config, remoteArgs, options = {}) {
  return run('ssh', [...sshOptions(config.sshKey), config.host, ...remoteArgs], options)
}

function readRemoteStatus(config) {
  const currentPath = runSsh(config, [
    'readlink',
    '-f',
    '/opt/feelandnote/web/current',
  ]).stdout
  const metadataResult = runSsh(config, [
    'cat',
    '/opt/feelandnote/web/current/.feelandnote-release.json',
  ], { allowFailure: true })
  let metadata = null
  if (metadataResult.status === 0 && metadataResult.stdout) {
    try {
      metadata = JSON.parse(metadataResult.stdout)
    } catch (error) {
      throw new Error(`Current Oracle release metadata is invalid: ${error.message}`)
    }
  }

  const caddyConfigResult = runSsh(config, [
    'curl',
    '--fail',
    '--silent',
    '--show-error',
    'http://127.0.0.1:2019/config/',
  ], { allowFailure: true })
  let caddyProxyPort = null
  let caddyConfigError = null
  if (caddyConfigResult.status === 0 && caddyConfigResult.stdout) {
    try {
      const caddyConfig = JSON.parse(caddyConfigResult.stdout)
      caddyProxyPort = inspectCaddyProxyPort(caddyConfig)
      if (caddyProxyPort === PRIMARY_PORT) {
        createBridgeCaddyConfig(caddyConfig, config.canaryPort)
      }
    } catch (error) {
      caddyConfigError = error instanceof Error ? error.message : String(error)
    }
  } else {
    caddyConfigError = caddyConfigResult.stderr || 'Caddy admin config is unavailable'
  }

  return {
    currentRelease: metadata?.releaseId ?? currentPath,
    currentCommit: metadata?.commit ?? null,
    currentPath,
    currentSlot: metadata?.slot ?? null,
    service: runSsh(config, [
      'sudo',
      'systemctl',
      'is-active',
      'feelandnote-web.service',
    ], { allowFailure: true }).stdout || 'unknown',
    caddy: runSsh(config, [
      'sudo',
      'systemctl',
      'is-active',
      'caddy',
    ], { allowFailure: true }).stdout || 'unknown',
    caddyProxyPort,
    caddyConfigError,
  }
}

function resolveDeployedCommit(repoRoot, remote) {
  const candidate = remote.currentCommit ?? path.posix.basename(remote.currentRelease).split('-')[0]
  const prefix = candidate
  if (!/^[0-9a-f]{5,40}$/u.test(prefix)) return null
  const resolved = run('git', ['rev-parse', '--verify', `${prefix}^{commit}`], {
    cwd: repoRoot,
    allowFailure: true,
  })
  return resolved.status === 0 ? resolved.stdout : null
}

function createPurgePlan(repoRoot, deployedCommit, targetCommit, explicitScopes) {
  if (!deployedCommit) {
    return {
      scopes: ['manual-required'],
      prefixes: [],
      files: [],
      manualRequired: true,
      error: 'The commit of the current Oracle release could not be resolved locally.',
    }
  }
  const changed = run('git', ['diff', '--name-only', '-z', deployedCommit, targetCommit], {
    cwd: repoRoot,
  }).stdout.split('\0').filter(Boolean)
  if (explicitScopes?.length) {
    return {
      ...createCloudflarePurgePlan(explicitScopes),
      changedFiles: changed,
      explicit: true,
      manualRequired: false,
    }
  }
  try {
    return {
      ...classifyCloudflarePurgeImpact(changed),
      changedFiles: changed,
      explicit: false,
      manualRequired: false,
    }
  } catch (error) {
    return {
      scopes: ['manual-required'],
      prefixes: [],
      files: [],
      changedFiles: changed,
      explicit: false,
      manualRequired: true,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function isOnRemoteBranch(repoRoot, commit) {
  const result = run('git', ['branch', '-r', '--contains', commit], {
    cwd: repoRoot,
    allowFailure: true,
  })
  return result.status === 0 && result.stdout.split(/\r?\n/u).some((line) => line.trim())
}

function copyBuildEnvironment(sourceRepo, worktreeRoot) {
  const sourceEnv = path.join(sourceRepo, WEB_RELATIVE_PATH, '.env')
  if (!existsSync(sourceEnv)) {
    throw new Error(`Local build environment is missing: ${sourceEnv}`)
  }
  const targetEnv = path.join(worktreeRoot, WEB_RELATIVE_PATH, '.env')
  copyFileSync(sourceEnv, targetEnv)
  const lines = readFileSync(targetEnv, 'utf8').replace(/\r/gu, '').split('\n')
  let replaced = false
  const productionLines = lines.map((line) => {
    if (!line.startsWith('NEXT_PUBLIC_SITE_URL=')) return line
    replaced = true
    return `NEXT_PUBLIC_SITE_URL=${PRODUCTION_SITE_URL}`
  })
  if (!replaced) productionLines.push(`NEXT_PUBLIC_SITE_URL=${PRODUCTION_SITE_URL}`)
  writeFileSync(targetEnv, productionLines.join('\n'), 'utf8')
}

function removeSecretFiles(rootPath) {
  const removed = []
  const pending = [rootPath]

  while (pending.length) {
    const directory = pending.pop()
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name)
      if (entry.name === '.env' || entry.name.startsWith('.env.')) {
        rmSync(entryPath, { recursive: true, force: true })
        removed.push(path.relative(rootPath, entryPath).replaceAll('\\', '/'))
        continue
      }
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) pending.push(entryPath)
    }
  }

  return removed
}

function assertInside(basePath, candidatePath, label) {
  const relative = path.relative(basePath, candidatePath)
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} escaped its root: ${candidatePath}`)
  }
}

function copyRuntimeAssets(worktreeRoot, standaloneRoot) {
  const webRoot = path.join(worktreeRoot, WEB_RELATIVE_PATH)
  const appRoot = path.join(standaloneRoot, WEB_RELATIVE_PATH)
  const publicTarget = path.join(appRoot, 'public')
  const staticTarget = path.join(appRoot, DIST_DIR, 'static')
  assertInside(standaloneRoot, publicTarget, 'Public target')
  assertInside(standaloneRoot, staticTarget, 'Static target')

  rmSync(publicTarget, { recursive: true, force: true })
  cpSync(path.join(webRoot, 'public'), publicTarget, { recursive: true })
  rmSync(staticTarget, { recursive: true, force: true })
  cpSync(path.join(webRoot, DIST_DIR, 'static'), staticTarget, { recursive: true })
}

function collectStandaloneLinks(repoRoot, standaloneRoot) {
  const links = []
  const pending = [standaloneRoot]
  const repoReal = realpathSync(repoRoot)

  while (pending.length) {
    const directory = pending.pop()
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) {
        const rawTarget = readlinkSync(entryPath)
        const absoluteTarget = realpathSync(path.resolve(path.dirname(entryPath), rawTarget))
        const targetInRepo = path.relative(repoReal, absoluteTarget)
        if (
          !targetInRepo
          || targetInRepo === '..'
          || targetInRepo.startsWith(`..${path.sep}`)
          || path.isAbsolute(targetInRepo)
        ) {
          throw new Error(`Standalone junction points outside its build worktree: ${entryPath}`)
        }

        const archiveTarget = path.join(standaloneRoot, targetInRepo)
        if (!existsSync(archiveTarget)) {
          throw new Error(`Standalone junction target was not traced: ${targetInRepo}`)
        }
        links.push({
          link: path.relative(standaloneRoot, entryPath).replaceAll('\\', '/'),
          target: targetInRepo.replaceAll('\\', '/'),
        })
        continue
      }
      if (entry.isDirectory()) pending.push(entryPath)
    }
  }

  links.sort((left, right) => left.link.localeCompare(right.link))
  return { version: 1, links }
}

function assertStandaloneReady(standaloneRoot) {
  const appRoot = path.join(standaloneRoot, WEB_RELATIVE_PATH)
  const required = [
    path.join(appRoot, 'server.js'),
    path.join(appRoot, DIST_DIR, 'BUILD_ID'),
    path.join(appRoot, DIST_DIR, 'static'),
    path.join(appRoot, 'public', 'sw.js'),
  ]
  for (const requiredPath of required) {
    if (!existsSync(requiredPath)) throw new Error(`Standalone output is incomplete: ${requiredPath}`)
  }

  const secrets = []
  const pending = [standaloneRoot]
  while (pending.length) {
    const directory = pending.pop()
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.env' || entry.name.startsWith('.env.')) {
        secrets.push(path.relative(standaloneRoot, path.join(directory, entry.name)))
      } else if (!entry.isSymbolicLink() && entry.isDirectory()) {
        pending.push(path.join(directory, entry.name))
      }
    }
  }
  if (secrets.length) throw new Error(`Secret files remain in standalone: ${secrets.join(', ')}`)
}

function createIsolatedBuild(repoRoot, commit, releaseId) {
  const taskRoot = mkdtempSync(path.join(tmpdir(), `feelandnote-oracle-${releaseId}-`))
  const worktreeRoot = path.join(taskRoot, 'worktree')
  const artifactsRoot = path.join(taskRoot, 'artifacts')
  mkdirSync(artifactsRoot)

  let worktreeCreated = false
  try {
    run('git', ['worktree', 'add', '--detach', worktreeRoot, commit], {
      cwd: repoRoot,
      inherit: true,
    })
    worktreeCreated = true
    copyBuildEnvironment(repoRoot, worktreeRoot)

    run('pnpm', ['install', '--frozen-lockfile'], { cwd: worktreeRoot, inherit: true })
    run('pnpm', ['build:web'], {
      cwd: worktreeRoot,
      inherit: true,
      env: {
        ...process.env,
        NEXT_DIST_DIR: DIST_DIR,
        NEXT_DEPLOYMENT_ID: releaseId,
      },
    })

    const webRoot = path.join(worktreeRoot, WEB_RELATIVE_PATH)
    const standaloneRoot = path.join(webRoot, DIST_DIR, 'standalone')
    if (!existsSync(standaloneRoot)) throw new Error(`Standalone build is missing: ${standaloneRoot}`)

    copyRuntimeAssets(worktreeRoot, standaloneRoot)
    const removedSecrets = removeSecretFiles(standaloneRoot)
    const manifest = collectStandaloneLinks(worktreeRoot, standaloneRoot)
    assertStandaloneReady(standaloneRoot)

    const archivePath = path.join(artifactsRoot, `${releaseId}.tar.gz`)
    const manifestPath = path.join(artifactsRoot, `${releaseId}.links.json`)
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    run('tar', ['--force-local', '--dereference', '-czf', archivePath, '-C', standaloneRoot, '.'], {
      inherit: true,
    })

    if (!existsSync(archivePath) || statSync(archivePath).size < 1_000_000) {
      throw new Error(`Release archive is missing or unexpectedly small: ${archivePath}`)
    }

    return {
      taskRoot,
      worktreeRoot,
      worktreeCreated,
      archivePath,
      manifestPath,
      manifestLinks: manifest.links.length,
      removedSecrets,
      archiveBytes: statSync(archivePath).size,
    }
  } catch (error) {
    error.buildContext = { taskRoot, worktreeRoot, worktreeCreated }
    throw error
  }
}

function removeBuildWorktree(repoRoot, build) {
  if (build?.worktreeCreated && existsSync(build.worktreeRoot)) {
    run('git', ['worktree', 'remove', '--force', build.worktreeRoot], {
      cwd: repoRoot,
      allowFailure: true,
    })
  }
}

function removeTaskRoot(build) {
  if (!build?.taskRoot || !existsSync(build.taskRoot)) return
  const expectedPrefix = realpathSync(tmpdir()) + path.sep
  const taskPath = path.resolve(build.taskRoot)
  if (!taskPath.startsWith(expectedPrefix) || !path.basename(taskPath).startsWith('feelandnote-oracle-')) {
    throw new Error(`Refusing to clean unexpected task directory: ${taskPath}`)
  }
  rmSync(taskPath, { recursive: true, force: true })
}

function uploadRelease(config, build, releaseId) {
  const remoteArchive = `/tmp/${releaseId}.tar.gz`
  const remoteManifest = `/tmp/${releaseId}.links.json`
  const remoteHelper = `/tmp/${releaseId}.remote.mjs`
  const helperPath = path.join(SCRIPT_ROOT, 'scripts', 'lib', 'oracle-web-remote.mjs')
  const uploaded = { remoteArchive, remoteManifest, remoteHelper }

  try {
    run('scp', [
      ...sshOptions(config.sshKey),
      build.archivePath,
      `${config.host}:${remoteArchive}`,
    ], { inherit: true })
    run('scp', [
      ...sshOptions(config.sshKey),
      build.manifestPath,
      `${config.host}:${remoteManifest}`,
    ], { inherit: true })
    run('scp', [
      ...sshOptions(config.sshKey),
      helperPath,
      `${config.host}:${remoteHelper}`,
    ], { inherit: true })
  } catch (error) {
    cleanupRemoteUploads(config, uploaded)
    throw error
  }

  return uploaded
}

function runRemoteHelper(config, uploaded, command, extraArgs = [], options = {}) {
  return runSsh(config, [
    '/usr/local/bin/node',
    uploaded.remoteHelper,
    command,
    '--release-id',
    options.releaseId,
    ...extraArgs,
  ], { inherit: options.inherit })
}

async function verifyPublicSeoImage(releaseId, probeSlug) {
  const url = `https://feelandnote.com/seo-image/celeb/${encodeURIComponent(probeSlug)}?locale=ko&v=deploy-${releaseId}`
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`Public SEO image returned HTTP ${response.status}`)
  if (!(response.headers.get('content-type') ?? '').toLowerCase().startsWith('image/jpeg')) {
    throw new Error(`Public SEO image has unexpected content type: ${response.headers.get('content-type')}`)
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  const dimensions = parseJpegDimensions(bytes)
  if (dimensions.width !== 800 || dimensions.height !== 800) {
    throw new Error(`Public SEO image is ${dimensions.width}x${dimensions.height}`)
  }
  return {
    url,
    status: response.status,
    cache: response.headers.get('cf-cache-status') ?? 'unknown',
    bytes: bytes.length,
    hash: createHash('sha256').update(bytes).digest('hex').slice(0, 16),
    ...dimensions,
  }
}

async function verifyPublicPageAssets(releaseId, probeSlug) {
  const pageUrl = new URL(`/celeb/${encodeURIComponent(probeSlug)}`, PRODUCTION_SITE_URL)
  pageUrl.searchParams.set('deploy-page-probe', releaseId)
  const response = await fetch(pageUrl, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`Public page returned HTTP ${response.status}`)

  const html = await response.text()
  const assetUrls = extractNextStaticAssetUrls(html, pageUrl.href)
  const staticAssets = await probeStaticAssetUrls(assetUrls)
  return {
    url: pageUrl.href,
    status: response.status,
    cache: response.headers.get('cf-cache-status') ?? 'unknown',
    staticAssets,
  }
}

function cleanupRemoteUploads(config, uploaded) {
  if (!uploaded) return
  runSsh(config, [
    'rm',
    '-f',
    uploaded.remoteArchive,
    uploaded.remoteManifest,
    uploaded.remoteHelper,
  ], { allowFailure: true })
}

function printPlan(plan) {
  const purgePlan = plan.purgePlan
    ? {
        ...plan.purgePlan,
        changedFileCount: plan.purgePlan.changedFiles?.length ?? 0,
        changedFiles: undefined,
      }
    : undefined
  process.stdout.write(`${JSON.stringify({ ...plan, purgePlan }, null, 2)}\n`)
}

async function main() {
  if (hasFlag(process.argv.slice(2), '--help')) {
    process.stdout.write(HELP)
    return
  }
  const config = parseArguments(process.argv.slice(2))
  const repoRoot = run('git', ['rev-parse', '--show-toplevel'], { cwd: SCRIPT_ROOT }).stdout
  const commit = resolveCommit(repoRoot, config.ref)
  const releaseId = config.releaseId ?? resolveDefaultReleaseId(repoRoot, commit)
  assertSafeReleaseId(releaseId)
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/u.test(config.probeSlug)) {
    throw new Error(`Unsafe probe slug: ${config.probeSlug}`)
  }
  if (
    !Number.isInteger(config.canaryPort)
    || config.canaryPort < 1024
    || config.canaryPort > 65535
    || config.canaryPort === PRIMARY_PORT
  ) {
    throw new Error(`Invalid canary port: ${config.canaryPort}`)
  }

  const remote = readRemoteStatus(config)
  const deployedCommit = resolveDeployedCommit(repoRoot, remote)
  const purgePlan = createPurgePlan(repoRoot, deployedCommit, commit, config.purgeScopes)
  const remoteBranchContainsCommit = isOnRemoteBranch(repoRoot, commit)
  const plan = {
    mode: config.mode,
    targetCommit: commit,
    releaseId,
    currentRelease: remote.currentRelease,
    currentCommit: remote.currentCommit,
    currentPath: remote.currentPath,
    currentSlot: remote.currentSlot,
    service: remote.service,
    caddy: remote.caddy,
    caddyProxyPort: remote.caddyProxyPort,
    caddyConfigError: remote.caddyConfigError,
    canaryPort: config.canaryPort,
    probeSlug: config.probeSlug,
    remoteBranchContainsCommit,
    purgePlan,
  }

  if (config.mode === 'plan') {
    printPlan({
      ...plan,
      nextCommand: purgePlan.manualRequired
        ? `pnpm deploy:web:oracle -- --execute --confirm ${EXECUTE_CONFIRMATION} --purge-scopes <scope[,scope]>`
        : `pnpm deploy:web:oracle -- --execute --confirm ${EXECUTE_CONFIRMATION}`,
    })
    return
  }

  if (config.mode === 'execute') {
    if (config.confirmation !== EXECUTE_CONFIRMATION) {
      throw new Error(`Execution requires --confirm ${EXECUTE_CONFIRMATION}`)
    }
    if (!remoteBranchContainsCommit && !config.allowUnpushed) {
      throw new Error('Target commit is not on a remote branch. Push it first; --allow-unpushed requires explicit user authorization.')
    }
    if (remote.service !== 'active') {
      throw new Error(`Current production service is not active: ${remote.service}`)
    }
    if (remote.caddy !== 'active') {
      throw new Error(`Caddy is not active: ${remote.caddy}`)
    }
    if (remote.caddyConfigError) {
      throw new Error(`Caddy routing could not be verified: ${remote.caddyConfigError}`)
    }
    if (remote.caddyProxyPort !== PRIMARY_PORT) {
      throw new Error(
        `Caddy routes to port ${remote.caddyProxyPort}; recover the previous traffic bridge before deploying`,
      )
    }
    if (purgePlan.manualRequired) {
      throw new Error(`Cloudflare purge impact needs an explicit --purge-scopes decision: ${purgePlan.error}`)
    }
  }

  let build
  let uploaded
  let canaryCleanupPending = false
  let deployed = false
  try {
    build = createIsolatedBuild(repoRoot, commit, releaseId)
    removeBuildWorktree(repoRoot, build)
    build.worktreeCreated = false

    if (config.mode === 'package') {
      printPlan({
        ...plan,
        package: {
          temporaryArchivePath: build.archivePath,
          archiveBytes: build.archiveBytes,
          temporaryManifestPath: build.manifestPath,
          manifestLinks: build.manifestLinks,
          removedSecrets: build.removedSecrets,
          artifactsPreserved: config.keepArtifacts,
        },
      })
      return
    }

    uploaded = uploadRelease(config, build, releaseId)
    runRemoteHelper(config, uploaded, 'prepare', [
      '--commit', commit,
      '--archive', uploaded.remoteArchive,
      '--manifest', uploaded.remoteManifest,
    ], { releaseId, inherit: true })
    canaryCleanupPending = true
    runRemoteHelper(config, uploaded, 'canary', [
      '--port', String(config.canaryPort),
      '--probe-slug', config.probeSlug,
    ], { releaseId, inherit: true })
    const activationOutput = runRemoteHelper(config, uploaded, 'activate', [
      '--port', String(config.canaryPort),
      '--probe-slug', config.probeSlug,
    ], { releaseId, inherit: false }).stdout
    const activation = JSON.parse(activationOutput)

    let publicPage
    let publicSeoImage
    try {
      publicPage = await verifyPublicPageAssets(releaseId, config.probeSlug)
      publicSeoImage = await verifyPublicSeoImage(releaseId, config.probeSlug)
    } catch (error) {
      runRemoteHelper(config, uploaded, 'rollback', [
        '--target', activation.previousTarget,
        '--port', String(config.canaryPort),
        '--probe-slug', config.probeSlug,
      ], { releaseId, inherit: true })
      throw new Error(`Public verification failed; rolled back to ${activation.previousTarget}: ${error.message}`)
    }
    let finalization
    try {
      const finalizationOutput = runRemoteHelper(config, uploaded, 'finalize', [
        '--previous-target', activation.previousTarget,
        '--previous-commit', deployedCommit,
      ], { releaseId, inherit: false }).stdout
      finalization = JSON.parse(finalizationOutput)
    } catch (error) {
      throw new Error(`Deployment is live and publicly verified, but Blue/Green finalization failed: ${error.message}`)
    }
    const canaryCleanupOutput = runRemoteHelper(config, uploaded, 'stop-canary', [
      '--port', String(config.canaryPort),
    ], { releaseId, inherit: false }).stdout
    const canaryCleanup = JSON.parse(canaryCleanupOutput)
    canaryCleanupPending = false
    deployed = true
    const requiredPurgeScopes = purgePlan.scopes.filter((scope) => scope !== 'none')
    printPlan({
      ...plan,
      deployed: true,
      activation,
      finalization,
      canaryCleanup,
      publicPage,
      publicSeoImage,
      cloudflarePurgeRequired: requiredPurgeScopes,
      // 배포는 여기서 끝나지 않는다. 남은 범위를 비우는 명령을 바로 손에 쥐여 준다.
      cloudflarePurgeCommands: requiredPurgeScopes.map(
        (scope) => `pnpm purge:web:cloudflare -- --scope ${scope} --execute`,
      ),
      cloudflareWorkflow: '.github/workflows/cloudflare-purge.yml',
    })
  } finally {
    if (uploaded) {
      if (canaryCleanupPending) {
        try {
          runRemoteHelper(config, uploaded, 'stop-canary', [
            '--port', String(config.canaryPort),
          ], {
            releaseId,
            inherit: false,
          })
          canaryCleanupPending = false
        } catch (error) {
          // 가용성을 지키기 위해 bridge로 선택된 canary는 사람이 복구할 때까지 남긴다.
          process.stderr.write(
            `[oracle-web-deploy] Canary cleanup deferred; remote helper preserved: ${error instanceof Error ? error.message : String(error)}\n`,
          )
        }
      }
      if (!canaryCleanupPending) {
        try {
          cleanupRemoteUploads(config, uploaded)
        } catch (error) {
          // 업로드 임시 파일 정리 실패가 배포·롤백 결과를 가리지 않게 한다.
          process.stderr.write(
            `[oracle-web-deploy] Temporary remote upload cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`,
          )
        }
      }
    }
    removeBuildWorktree(repoRoot, build)
    if (build && !config.keepArtifacts) removeTaskRoot(build)
    if (!deployed && config.mode === 'execute') {
      process.stderr.write(`[oracle-web-deploy] Deployment did not complete. The active deployment was preserved or rollback was attempted.\n`)
    }
  }
}

main().catch((error) => {
  const context = error?.buildContext
  if (context) {
    try {
      removeBuildWorktree(SCRIPT_ROOT, context)
      removeTaskRoot(context)
    } catch {
      // 안전 검증이 실패한 임시 경로는 아래 오류와 함께 사람이 확인한다.
    }
  }
  console.error(`[oracle-web-deploy] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
