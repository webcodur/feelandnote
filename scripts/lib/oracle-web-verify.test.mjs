import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { verifyProduction } from './oracle-web-verify.mjs'

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

test('public verification bypasses edge cache and reads the new HTML and complete assets', async t => {
  const f = await fixture(t)
  const result = await verifyProduction({ origin: f.origin, releaseId: f.id })
  assert.equal(f.requests.length, 11) // One identity check, eight pages, two deduplicated assets.
  assert.equal(result.staticAssets.checked, 2)
  assert.equal(result.staticAssets.bytes, 20)
  assert.ok(f.requests.some(u => u.pathname === '/en/library' && u.searchParams.has('_rsc')))
  assert.ok(f.requests.some(u => u.pathname === '/api/deployment'))
})

test('a cached 200 is not evidence of origin health', async t => {
  const f = await fixture(t, { cached: true })
  await assert.rejects(verifyProduction({ origin: f.origin, releaseId: f.id }), /cached response/i)
})

test('a fresh deployment endpoint does not hide stale page HTML', async t => {
  const f = await fixture(t, { staleHtml: true })
  await assert.rejects(verifyProduction({ origin: f.origin, releaseId: f.id }), /deployment id/i)
})

test('200 asset headers with a body that never finishes fail the verification', async t => {
  const f = await fixture(t, { stalledAsset: true })
  await assert.rejects(verifyProduction({ origin: f.origin, releaseId: f.id, timeoutMs: 100 }))
})

test('an inactive runtime fails before public requests', async t => {
  const f = await fixture(t)
  await assert.rejects(verifyProduction({
    origin: f.origin, releaseId: f.id,
    readRuntime: async () => ({ service: 'failed', mainPid: 0 }),
  }), /not active/i)
  assert.equal(f.requests.length, 0)
})

test('an inactive tunnel fails before public requests', async t => {
  const f = await fixture(t)
  await assert.rejects(verifyProduction({
    origin: f.origin, releaseId: f.id,
    readRuntime: async () => ({ service: 'active', mainPid: 10, tunnel: 'inactive' }),
  }), /Tunnel is not active/i)
  assert.equal(f.requests.length, 0)
})
