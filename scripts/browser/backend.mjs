import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const isWindows = process.platform === 'win32'
const defaultObscuraBin = isWindows
  ? 'C:\\Tools\\obscura\\v0.2.0\\obscura.exe'
  : 'obscura'

const obscuraBin = process.env.OBSCURA_BIN || defaultObscuraBin
const obscuraPort = readPort('OBSCURA_PORT', 9223)
const chromePort = readPort('CHROME_CDP_PORT', 9222)
const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
const obscuraStorage =
  process.env.OBSCURA_STORAGE_DIR ||
  path.join(localAppData, 'Feelandnote', 'obscura', 'public-research')

const obscuraEndpoint = `http://127.0.0.1:${obscuraPort}`
const chromeEndpoint = `http://127.0.0.1:${chromePort}`

function readPort(name, fallback) {
  const value = Number(process.env[name] || fallback)
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be a TCP port between 1 and 65535.`)
  }
  return value
}

function checkBinary() {
  const result = spawnSync(obscuraBin, ['--version'], {
    encoding: 'utf8',
    windowsHide: true,
  })

  if (result.error) {
    return { ready: false, detail: result.error.message }
  }

  return {
    ready: result.status === 0,
    detail: (result.stdout || result.stderr || '').trim(),
  }
}

async function probe(endpoint) {
  try {
    const response = await fetch(`${endpoint}/json/version`, {
      signal: AbortSignal.timeout(1500),
    })
    return { ready: response.ok, detail: `HTTP ${response.status}` }
  } catch (error) {
    return { ready: false, detail: error instanceof Error ? error.message : String(error) }
  }
}

function printStatus(label, result, extra = '') {
  const state = result.ready ? 'READY' : 'NOT READY'
  console.log(`${label}: ${state}${extra ? ` — ${extra}` : ''}`)
  if (result.detail) console.log(`  ${result.detail}`)
}

async function status() {
  const binary = checkBinary()
  printStatus('Plan A binary', binary, obscuraBin)
  printStatus('Plan A CDP', await probe(obscuraEndpoint), obscuraEndpoint)
  printStatus('Plan B Chrome CDP', await probe(chromeEndpoint), chromeEndpoint)
}

function startPlanA() {
  mkdirSync(obscuraStorage, { recursive: true })
  console.log(`Starting Plan A (Obscura) on ${obscuraEndpoint}`)
  console.log(`Storage: ${obscuraStorage}`)
  console.log('Plan B keeps using the existing Chrome session on port 9222.')

  const child = spawn(
    obscuraBin,
    [
      'serve',
      '--host',
      '127.0.0.1',
      '--port',
      String(obscuraPort),
      '--storage-dir',
      obscuraStorage,
    ],
    { stdio: 'inherit', windowsHide: false },
  )

  child.on('error', (error) => {
    console.error(`Could not start Plan A: ${error.message}`)
    process.exitCode = 1
  })
  child.on('exit', (code, signal) => {
    if (signal) console.log(`Plan A stopped by ${signal}.`)
    process.exitCode = code ?? 1
  })
}

function assertPublicUrl(rawUrl) {
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`)
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Plan A accepts only http(s) URLs.')
  }

  const forbiddenHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'])
  if (forbiddenHosts.has(url.hostname)) {
    throw new Error('Plan A refuses loopback URLs. Use Plan B or an explicit local test outside this wrapper.')
  }
}

function fetchPlanA(args) {
  const [rawUrl, dump = 'markdown'] = args
  if (!rawUrl) throw new Error('Usage: pnpm browser:fetch-a <http(s) URL> [markdown|text|html|links]')
  assertPublicUrl(rawUrl)

  const allowedDumps = new Set(['markdown', 'text', 'html', 'links'])
  if (!allowedDumps.has(dump)) throw new Error(`Unsupported dump type: ${dump}`)

  const child = spawn(
    obscuraBin,
    ['fetch', rawUrl, '--dump', dump, '--quiet', '--timeout', '30'],
    { stdio: 'inherit', windowsHide: true },
  )
  child.on('error', (error) => {
    console.error(`Could not run Plan A fetch: ${error.message}`)
    process.exitCode = 1
  })
  child.on('exit', (code, signal) => {
    if (signal) console.error(`Plan A fetch stopped by ${signal}.`)
    process.exitCode = code ?? 1
  })
}

async function main() {
  const [command, ...args] = process.argv.slice(2)

  switch (command) {
    case 'status':
      await status()
      return
    case 'start-a':
      startPlanA()
      return
    case 'check-b':
      {
        const chrome = await probe(chromeEndpoint)
        printStatus('Plan B Chrome CDP', chrome, chromeEndpoint)
        if (!chrome.ready) {
          console.log('Start the separate logged-in Chrome profile described in sw/web-bo/scripts/coupang/README.md.')
        }
      }
      return
    case 'fetch-a':
      fetchPlanA(args)
      return
    default:
      console.log('Usage:')
      console.log('  pnpm browser:status')
      console.log('  pnpm browser:plan-a')
      console.log('  pnpm browser:plan-b')
      console.log('  node scripts/browser/backend.mjs fetch-a <http(s) URL> [markdown|text|html|links]')
      process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
