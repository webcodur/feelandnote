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
      const assetRequests = requests.filter(request => request.pathname === url.pathname).length
      if (options.assetStatus && (!options.transientAsset || assetRequests === 1)) {
        res.writeHead(options.assetStatus)
        res.end('unavailable')
        return
      }
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
  assert.ok(f.requests.some(u => u.pathname === '/en/explore/works' && u.searchParams.has('_rsc')))
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

test('a transient upstream 503 retries assets and still requires complete 200 bodies', async t => {
  const f = await fixture(t, { assetStatus: 503, transientAsset: true })
  const result = await verifyProduction({ origin: f.origin, releaseId: f.id })
  assert.equal(result.staticAssets.checked, 2)
  assert.equal(result.staticAssets.bytes, 20)
  assert.equal(f.requests.filter(url => url.pathname.startsWith('/_next/static/')).length, 4)
})

test('persistent upstream failure aborts after three attempts per asset', async t => {
  const f = await fixture(t, { assetStatus: 503 })
  await assert.rejects(verifyProduction({ origin: f.origin, releaseId: f.id }), /HTTP 503/)
  assert.equal(f.requests.filter(url => url.pathname === '/_next/static/app.js').length, 3)
})

test('a missing static file fails immediately instead of being retried', async t => {
  const f = await fixture(t, { assetStatus: 404 })
  await assert.rejects(verifyProduction({ origin: f.origin, releaseId: f.id }), /HTTP 404/)
  assert.equal(f.requests.filter(url => url.pathname === '/_next/static/app.js').length, 1)
})

test('an inactive tunnel fails before public requests', async t => {
  const f = await fixture(t)
  await assert.rejects(verifyProduction({
    origin: f.origin, releaseId: f.id,
    readRuntime: async () => ({ service: 'active', mainPid: 10, tunnel: 'inactive' }),
  }), /Tunnel is not active/i)
  assert.equal(f.requests.length, 0)
})
