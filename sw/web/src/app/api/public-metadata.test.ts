import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server'
import { GET as summary } from './wiki-summary/route'
import { GET as works } from './celeb-works/route'

test('metadata APIs reject invalid input before contacting upstreams', async (t) => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({}) })
  assert.equal((await summary(new NextRequest(`http://localhost/api/wiki-summary?title=${'x'.repeat(513)}`))).status, 400)
  assert.equal((await works(new NextRequest('http://localhost/api/celeb-works?qid=Qabc'))).status, 400)
  assert.equal(calls, 0)
})

test('upstream failure is not cached as a successful empty result', async (t) => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    return calls === 1 ? new Response('unavailable', { status: 503 }) : Response.json({ extract: 'Recovered summary' })
  })
  const request = () => new NextRequest('http://localhost/api/wiki-summary?title=Transient_failure_fixture')
  const failed = await summary(request())
  assert.equal(failed.status, 502)
  assert.equal(failed.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await (await summary(request())).json(), { summary: 'Recovered summary' })
  assert.equal(calls, 2)
})

test('concurrent summary reads share one bounded upstream request', async (t) => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (_url: RequestInfo | URL, options?: RequestInit) => {
    calls++
    assert.ok(options?.signal instanceof AbortSignal)
    assert.equal(options?.cache, 'no-store')
    await new Promise(resolve => setTimeout(resolve, 10))
    return Response.json({ extract: 'Shared summary' })
  })
  const request = () => new NextRequest('http://localhost/api/wiki-summary?title=Concurrent_fixture')
  const responses = await Promise.all([summary(request()), summary(request())])
  for (const response of responses) assert.deepEqual(await response.json(), { summary: 'Shared summary' })
  assert.equal(calls, 1)
})

test('works upstream failure returns an uncached error and can recover', async (t) => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    return calls === 1 ? new Response('rate limited', { status: 429 }) : Response.json({ results: { bindings: [] } })
  })
  const request = () => new NextRequest('http://localhost/api/celeb-works?qid=Q999999991')
  const failed = await works(request())
  assert.equal(failed.status, 502)
  assert.equal(failed.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await (await works(request())).json(), { works: [] })
  assert.equal(calls, 2)
})
