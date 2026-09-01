import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export const DEFAULT_KIRO_MODEL = 'gpt-5.6-sol'
export const DEFAULT_KIRO_EFFORT = 'high'
export const DEFAULT_TOP_LEVEL_CONCURRENCY = 2
export const MAX_INTERNAL_WORKERS_PER_TERMINAL = 3
export const KIRO_HARD_THROTTLE = /ClientThrottleError|USER_REQUEST_RATE_EXCEEDED|Too many requests/iu

export function resolveKiroPath() {
  const localAppData = process.env.LOCALAPPDATA
  if (localAppData) {
    const installed = resolve(localAppData, 'Kiro-Cli', 'kiro-cli.exe')
    if (existsSync(installed)) return installed
  }

  if (process.platform === 'win32') {
    const found = spawnSync('where.exe', ['kiro-cli'], {
      encoding: 'utf8',
      windowsHide: true,
    })
    const first = String(found.stdout ?? '').split(/\r?\n/u).find(Boolean)
    if (found.status === 0 && first) return first.trim()
  }

  return 'kiro-cli'
}

export function buildKiroArgs(prompt, options = {}) {
  if (typeof prompt !== 'string' || prompt.trim() === '') {
    throw new TypeError('Kiro prompt must be a non-empty string')
  }

  const {
    model = DEFAULT_KIRO_MODEL,
    effort = DEFAULT_KIRO_EFFORT,
    agentEngine = 'v3',
    trustAllTools = false,
    trustTools,
  } = options

  if (!trustAllTools && !Array.isArray(trustTools)) {
    throw new TypeError('Choose trustAllTools or provide a trustTools array explicitly')
  }

  const args = [
    'chat',
    '--agent-engine', agentEngine,
    '--model', model,
    '--effort', effort,
    '--no-interactive',
    '--output-format', 'text',
    '--wrap', 'never',
  ]
  if (trustAllTools) args.push('--trust-all-tools')
  else args.push(`--trust-tools=${trustTools.join(',')}`)
  args.push(prompt)
  return args
}

export function runKiro(prompt, options = {}) {
  const {
    cwd = process.cwd(),
    timeoutMs = 30 * 60_000,
    maxOutputBytes = 4 * 1024 * 1024,
    onOutput,
    ...argumentOptions
  } = options

  return new Promise((resolveRun, rejectRun) => {
    const kiroPath = resolveKiroPath()
    const child = spawn(kiroPath, buildKiroArgs(prompt, argumentOptions), {
      cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const startedAt = Date.now()
    let stdout = ''
    let stderr = ''
    let hardThrottle = false
    let timedOut = false
    let settled = false
    let exitFallback = null

    const append = (current, chunk) => `${current}${chunk}`.slice(-maxOutputBytes)
    const observe = (stream) => (chunk) => {
      const value = chunk.toString()
      if (stream === 'stdout') stdout = append(stdout, value)
      else stderr = append(stderr, value)
      if (KIRO_HARD_THROTTLE.test(value)) hardThrottle = true
      onOutput?.({ stream, value, childPid: child.pid })
    }
    child.stdout.on('data', observe('stdout'))
    child.stderr.on('data', observe('stderr'))

    const finish = (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (exitFallback) clearTimeout(exitFallback)
      resolveRun({
        code,
        signal,
        childPid: child.pid,
        stdout,
        stderr,
        hardThrottle,
        timedOut,
        elapsedMs: Date.now() - startedAt,
      })
    }

    const timeout = setTimeout(() => {
      timedOut = true
      killOwnedTree(child.pid)
      exitFallback = setTimeout(() => finish(null, 'timeout'), 5_000)
    }, timeoutMs)

    child.on('error', (error) => {
      clearTimeout(timeout)
      rejectRun(error)
    })
    child.on('exit', (code, signal) => {
      exitFallback = setTimeout(() => finish(code, signal), 1_500)
    })
    child.on('close', finish)
  })
}

export function killOwnedTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    return
  }
  try { process.kill(pid, 'SIGTERM') } catch { /* already gone */ }
}
