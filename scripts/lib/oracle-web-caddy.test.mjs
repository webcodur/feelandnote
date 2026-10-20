import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'
import { createCaddyTrafficPolicy, createCaddyTrafficPolicySource } from './oracle-web-remote.mjs'

// Run against the installed origin binary with CADDY_BINARY=/usr/bin/caddy.
// Each fixture owns its process, loopback ports and temporary configuration.
async function fixture(t, format, bounded = true) {
  const parent = path.join(tmpdir(), 'feelandnote')
  mkdirSync(parent, { recursive: true })
  const root = mkdtempSync(path.join(parent, 'caddy-test-'))
  const held = []
  const received = []
  const upstream = createServer(async (req, res) => {
    let body = ''
    for await (const chunk of req) body += chunk
    received.push({ method: req.method, url: req.url, body })
    if (req.url === '/hold') { held.push(res); return }
    if (req.headers['x-drop-after-read']) { req.socket.destroy(); return }
    res.writeHead(req.headers['x-fail'] ? 500 : 200).end(body || 'ready')
  })
  upstream.listen(0, '127.0.0.1')
  await once(upstream, 'listening')
  const reserve = createServer()
  reserve.listen(0, '127.0.0.1')
  await once(reserve, 'listening')
  const port = reserve.address().port
  await new Promise(resolve => reserve.close(resolve))
  const dial = `127.0.0.1:${upstream.address().port}`
  let config
  if (format === 'caddyfile') {
    config = '{\n admin off\n auto_https off\n}\n'
      + createCaddyTrafficPolicySource(`http://127.0.0.1:${port} {\n reverse_proxy 127.0.0.1:3000 {\n }\n}\n`)
        .replace('127.0.0.1:3000', dial)
        .replace('unhealthy_request_count 64', 'unhealthy_request_count 2')
        .replace('max_conns_per_host 64', 'max_conns_per_host 2')
  } else {
    const source = { handler: 'reverse_proxy', upstreams: [{ dial: '127.0.0.1:3000' }] }
    const handler = bounded ? createCaddyTrafficPolicy(source) : source
    handler.upstreams[0].dial = dial
    handler.health_checks = { passive: { max_fails: 1, unhealthy_request_count: 2 } }
    config = JSON.stringify({ admin: { disabled: true, config: { persist: false } },
      apps: { http: { servers: { test: { listen: [`127.0.0.1:${port}`], routes: [{ handle: [handler] }] } } } } })
  }
  const file = path.join(root, format === 'caddyfile' ? 'Caddyfile' : 'config.json')
  writeFileSync(file, config)
  let logs = ''
  const child = spawn(process.env.CADDY_BINARY, ['run', '--config', file, ...(format === 'caddyfile' ? ['--adapter', 'caddyfile'] : [])], {
    env: { ...process.env, XDG_CONFIG_HOME: path.join(root, 'config'), XDG_DATA_HOME: path.join(root, 'data') },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', value => { logs = (logs + value).slice(-16000) })
  child.stderr.on('data', value => { logs = (logs + value).slice(-16000) })
  const stopped = once(child, 'exit')
  t.after(async () => {
    for (const res of held.splice(0)) res.end('released')
    upstream.closeAllConnections()
    await new Promise(resolve => upstream.close(resolve))
    if (child.exitCode === null) child.kill('SIGTERM')
    await stopped
    assert.ok(path.dirname(root) === parent && path.basename(root).startsWith('caddy-test-'))
    rmSync(root, { recursive: true })
  })
  const base = `http://127.0.0.1:${port}`
  for (let attempt = 0; ; attempt++) {
    try { await (await fetch(base, { signal: AbortSignal.timeout(300) })).text(); break } catch {
      if (attempt === 60 || child.exitCode !== null) throw new Error(`Caddy did not start: ${logs}`)
      await delay(50)
    }
  }
  async function saturate() {
    const requests = Array.from({ length: 2 }, () => fetch(base + '/hold').then(r => r.text()))
    for (let attempt = 0; held.length < 2; attempt++) {
      if (attempt === 100) throw new Error('Upstream did not reach admission limit')
      await delay(10)
    }
    return async () => { for (const res of held.splice(0)) res.end('released'); await Promise.all(requests) }
  }
  return { base, received, saturate }
}

test('old admission immediately rejects a revalidation POST while the upstream is busy', { skip: !process.env.CADDY_BINARY }, async t => {
  const app = await fixture(t, 'json', false)
  const release = await app.saturate()
  const response = await fetch(app.base + '/api/revalidate', { method: 'POST', body: 'fixture' })
  assert.equal(response.status, 503)
  await response.text()
  await release()
})

for (const format of ['json', 'caddyfile']) {
  test(`${format}: admission waits for unsent revalidation POSTs without replaying delivered POSTs`, { skip: !process.env.CADDY_BINARY }, async t => {
    const app = await fixture(t, format)
    const release = await app.saturate()
    const body = JSON.stringify({ tag: 'contents:fixture', secret: 'fixture' })
    const pending = fetch(app.base + '/api/revalidate', { method: 'POST', body })
    assert.equal(await Promise.race([pending.then(() => 'returned'), delay(150, 'waiting')]), 'waiting')
    await release()
    const response = await pending
    assert.equal(response.status, 200)
    assert.equal(await response.text(), body)
    assert.equal(app.received.filter(r => r.url === '/api/revalidate').length, 1)

    for (const url of ['/api/revalidate', '/api/revalidate/v2', '/api/submit']) {
      const before = app.received.length
      const dropped = await fetch(app.base + url, { method: 'POST', body, headers: { 'x-drop-after-read': '1' } })
      assert.equal(dropped.status, 502)
      await dropped.text()
      assert.equal(app.received.length - before, 1, 'A POST already sent upstream must not be sent again')
    }
    const releaseAgain = await app.saturate()
    const start = performance.now()
    const expired = await fetch(app.base + '/api/revalidate/v2', { method: 'POST', body })
    assert.equal(expired.status, 503)
    await expired.text()
    assert.ok(performance.now() - start >= 1900, 'Wait for the configured admission budget')
    assert.ok(performance.now() - start < 4000, 'The admission wait must remain bounded')
    await releaseAgain()
  })
}
