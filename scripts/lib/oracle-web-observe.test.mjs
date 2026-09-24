import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { observeProduction } from './oracle-web-observe.mjs'

async function fixture(t, options = {}) {
  const id = 'ffe824ac-web-20260921t122802z'
  const requests = []
  const server = createServer((req, res) => {
    res.setHeader('connection', 'close')
    const url = new URL(req.url, 'http://localhost')
    requests.push(url)
    if (url.pathname === '/api/deployment') {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ id }))
    } else if (url.pathname.startsWith('/_next/static/')) {
      res.writeHead(200, { 'content-type': 'text/javascript', 'content-length': 10 })
      if (options.stalledAsset) res.write('x')
      else res.end('0123456789')
    } else {
      res.setHeader('cf-cache-status', options.cached ? 'HIT' : 'DYNAMIC')
      res.setHeader('content-type', 'text/html')
      const pageId = options.staleHtml ? 'old-deployment' : id
      res.end(`<html data-dpl-id="${pageId}"><script src="/_next/static/app.js?dpl=${pageId}"></script><script src="/_next/static/other.js?dpl=${pageId}"></script></html>`)
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections() }))
  return { id, origin: `http://127.0.0.1:${server.address().port}`, requests }
}

test('public observation bypasses edge cache and reads the new HTML and complete assets', async t => {
  const f = await fixture(t)
  const result = await observeProduction({ origin: f.origin, releaseId: f.id, durationMs: 0 })
  assert.equal(result.passes, 1)
  assert.equal(result.last.staticAssets.checked, 2)
  assert.equal(result.last.staticAssets.bytes, 20)
  assert.ok(f.requests.some(u => u.pathname === '/en/library' && u.searchParams.has('_rsc')))
  assert.ok(f.requests.some(u => u.pathname === '/api/deployment'))
})

test('a cached 200 is not evidence of origin health', async t => {
  const f = await fixture(t, { cached: true })
  await assert.rejects(observeProduction({ origin: f.origin, releaseId: f.id, durationMs: 0 }), /cached response/i)
})

test('a fresh deployment endpoint does not hide stale page HTML', async t => {
  const f = await fixture(t, { staleHtml: true })
  await assert.rejects(observeProduction({ origin: f.origin, releaseId: f.id, durationMs: 0 }), /deployment id/i)
})

test('200 asset headers with a body that never finishes fail the observation', async t => {
  const f = await fixture(t, { stalledAsset: true })
  await assert.rejects(observeProduction({ origin: f.origin, releaseId: f.id, durationMs: 0, timeoutMs: 100 }))
})

test('a later process restart fails even if every public response is 200', async t => {
  const f = await fixture(t)
  let clock = 0
  let checks = 0
  await assert.rejects(observeProduction({
    origin: f.origin, releaseId: f.id, durationMs: 60_000,
    now: () => clock, sleep: async ms => { clock += ms },
    readRuntime: async () => ({ service: 'active', mainPid: ++checks === 1 ? 10 : 11, restarts: 0 }),
  }), /restarted/i)
})
