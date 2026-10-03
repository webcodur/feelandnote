import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { CADDY_MAX_CONCURRENT_REQUESTS, createCaddyTrafficPolicySource } from '../lib/oracle-web-remote.mjs'

// Run on the origin's installed Caddy, using private temporary ports and a fake backend.
// Never send a load test to the production application.
let active = 0
let peak = 0
const backend = createServer((_request, response) => {
  peak = Math.max(peak, ++active)
  setTimeout(() => { active--; response.writeHead(200, { 'content-length': '2' }).end('OK') }, 1000)
})
await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve))
const reservation = createServer()
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve))
const proxyPort = reservation.address().port
await new Promise(resolve => reservation.close(resolve))
const taskRoot = mkdtempSync(path.join(tmpdir(), 'feelandnote-traffic-check-'))
const configPath = path.join(taskRoot, 'Caddyfile')
const source = `{\n\tadmin off\n}\nhttp://127.0.0.1:${proxyPort} {\n\tbind 127.0.0.1\n\treverse_proxy 127.0.0.1:3000 {\n\t}\n}\n`
writeFileSync(configPath, createCaddyTrafficPolicySource(source).replace('127.0.0.1:3000 {', `127.0.0.1:${backend.address().port} {`))
const caddy = spawn('caddy', ['run', '--config', configPath, '--adapter', 'caddyfile'], { stdio: ['ignore', 'ignore', 'pipe'] })
let log = ''
caddy.stderr.on('data', chunk => { log = (log + chunk).slice(-8000) })
const url = `http://127.0.0.1:${proxyPort}/`
async function request() {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  await response.text()
  return response.status
}
try {
  let ready = false
  for (let attempt = 0; attempt < 30; attempt++) {
    try { ready = await request() === 200; if (ready) break } catch { /* Startup only. */ }
    if (caddy.exitCode !== null) throw new Error(log)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.ok(ready, `Shadow Caddy never became ready: ${log}`)
  peak = 0
  const requests = CADDY_MAX_CONCURRENT_REQUESTS * 2
  const started = performance.now()
  const statuses = await Promise.all(Array.from({ length: requests }, request))
  const recovery = await request()
  const result = { requests, maxBackendConcurrent: peak,
    statuses: Object.fromEntries([...new Set(statuses)].map(status => [status, statuses.filter(value => value === status).length])),
    durationMs: Math.round(performance.now() - started), recovery }
  process.stdout.write(`${JSON.stringify(result)}\n`)
  assert.ok(peak <= CADDY_MAX_CONCURRENT_REQUESTS, 'Backend exceeded the connection limit')
  assert.ok(statuses.includes(503), 'Overload was not rejected before reaching the backend')
  assert.ok(statuses.every(status => status === 200 || status === 503), 'Unexpected proxy failures')
  assert.equal(recovery, 200, 'Admission did not recover after the burst')
} finally {
  if (caddy.exitCode === null) {
    const exit = once(caddy, 'exit')
    caddy.kill('SIGTERM')
    const timer = setTimeout(() => caddy.kill('SIGKILL'), 5000)
    await exit
    clearTimeout(timer)
  }
  backend.closeAllConnections()
  await new Promise(resolve => backend.close(resolve))
  rmSync(taskRoot, { recursive: true })
}
