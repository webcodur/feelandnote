import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { codexCall } from './codex-call.mjs'

function codexPids() {
  if (process.platform !== 'win32') return new Set()
  const command = "Get-CimInstance Win32_Process | Where-Object Name -eq 'codex.exe' | Select-Object -ExpandProperty ProcessId"
  const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', command], { encoding: 'utf8' })
  return new Set(output.split(/\s+/).filter(Boolean).map(Number))
}

function killExactTree(pid) {
  if (process.platform !== 'win32') return
  try {
    execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
  } catch {
    // The process may already have exited between inspection and cleanup.
  }
}

if (process.argv.includes('--child')) {
  try {
    await codexCall('Return only the word ok.', {
      model: 'gpt-5.6-sol',
      effort: 'low',
      timeoutMs: 100,
    })
    process.exit(2)
  } catch (error) {
    process.exit(/timeout/i.test(error instanceof Error ? error.message : String(error)) ? 0 : 3)
  }
}

if (process.platform !== 'win32') {
  console.log(JSON.stringify({ result: 'SKIP', reason: 'Windows process-tree regression' }))
  process.exit(0)
}

const before = codexPids()
const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--child'], {
  stdio: 'ignore',
  windowsHide: true,
})
let childExitCode = null
child.once('exit', (code) => {
  childExitCode = code
})
const deadline = Date.now() + 5_000
let leaked = []
do {
  await new Promise((resolve) => setTimeout(resolve, 100))
  leaked = [...codexPids()].filter((pid) => !before.has(pid))
  if (childExitCode !== null && leaked.length === 0) break
} while (Date.now() < deadline)
const childStillRunning = childExitCode === null

if (childStillRunning || leaked.length || childExitCode !== 0) {
  console.error(JSON.stringify({
    result: 'FAIL',
    childStillRunning,
    childExitCode,
    leakedCodexPids: leaked,
  }))
  killExactTree(child.pid)
  for (const pid of leaked) killExactTree(pid)
  process.exit(1)
}

console.log(JSON.stringify({ result: 'PASS', childExitCode, leakedCodexPids: [] }))
