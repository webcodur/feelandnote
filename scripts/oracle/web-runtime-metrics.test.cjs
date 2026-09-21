const { test } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
test('completed and aborted requests release counters without retaining URL details', async () => {
  const metrics = require('./web-runtime-metrics.cjs')
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/content/')) { res.writeHead(200); res.write('partial'); return }
    res.end('ok')
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  try {
    await (await fetch(`${origin}/en/celeb/private-name?secret=hidden`)).text()
    await new Promise((resolve, reject) => {
      const req = http.get(`${origin}/content/private-id?token=hidden`, res => {
        res.once('data', () => { res.destroy(); resolve() })
      })
      req.on('error', reject)
    })
    await new Promise(resolve => setTimeout(resolve, 30))
    const result = metrics.snapshot()
    assert.equal(result.active, 0)
    assert.equal(result.routes.celeb.requests, 1)
    assert.equal(result.routes.content.aborted, 1)
    assert.ok(result.memory.heapUsed > 0)
    assert.doesNotMatch(JSON.stringify(result), /private|hidden|secret|token/)
    assert.deepEqual(metrics.snapshot().routes, {})
  } finally { metrics.stop(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})
