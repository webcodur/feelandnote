import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import { createClient } from '@supabase/supabase-js'

import { rawFetch } from './rawFetch'

const require = createRequire(import.meta.url)
const { createDedupeFetch } = require('next/dist/server/lib/dedupe-fetch')
const { createPatchedFetcher } = require('next/dist/server/lib/patch-fetch')

test('bypasses the installed Next fetch wrapper and its response-cloning dedupe layer', async (t) => {
  const responses: Response[] = []
  const received: RequestInit[] = []
  let nextContextReads = 0
  const origin: typeof fetch = async (_input, init) => {
    received.push(init ?? {})
    const response = new Response('public DB result')
    responses.push(response)
    return response
  }
  const patched = createPatchedFetcher(createDedupeFetch(origin), {
    workAsyncStorage: { getStore: () => { nextContextReads++; return undefined } },
    workUnitAsyncStorage: { getStore: () => { nextContextReads++; return undefined } },
  })

  // Importing rawFetch above precedes patching, as can happen in a Next worker.
  // mock.method would replace the function and drop Next's attached properties.
  const previousFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = previousFetch })
  globalThis.fetch = patched
  const init = { headers: { apikey: 'test-only', Authorization: 'Bearer test-only' } }
  for (let index = 0; index < 2; index++) {
    const response = await rawFetch('https://db.example.test/rest/v1/celebs', init)
    assert.strictEqual(response, responses[index], 'the original response must not be cloned or retained')
    assert.equal(await response.text(), 'public DB result')
  }
  assert.equal(nextContextReads, 0, 'must not enter Next fetch cache/context handling')
  assert.equal(received.length, 2)
  assert(received.every((options) => options.signal instanceof AbortSignal))
  assert.deepEqual(received[0].headers, init.headers)
  assert.equal('signal' in init, false, 'must not mutate the caller options')
})

test('preserves an explicit signal, POST body and redirect policy', async (t) => {
  const controller = new AbortController()
  const init: RequestInit = {
    method: 'POST', body: '{"public":true}', redirect: 'manual', signal: controller.signal,
  }
  t.mock.method(globalThis, 'fetch', async (_input: RequestInfo | URL, options?: RequestInit) => {
    assert.deepEqual(options, init)
    assert.strictEqual(options?.signal, controller.signal)
    return new Response('ok')
  })
  await rawFetch('https://db.example.test/rest/v1/rpc/list', init)
})

test('PostgREST GETs consume the original response without entering Next caching', async (t) => {
  const responses: Response[] = []
  let nextContextReads = 0
  const patched = createPatchedFetcher(createDedupeFetch(async () => {
    const response = Response.json([{ id: 'public-celeb' }])
    responses.push(response)
    return response
  }), {
    workAsyncStorage: { getStore: () => { nextContextReads++; return undefined } },
    workUnitAsyncStorage: { getStore: () => { nextContextReads++; return undefined } },
  })
  const previousFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = previousFetch })
  globalThis.fetch = patched
  const db = createClient('https://db.example.test', 'test-only', {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: rawFetch },
  })
  const results = await Promise.all([
    db.from('celebs').select('id'),
    db.from('celebs').select('id'),
  ])
  assert.equal(nextContextReads, 0)
  assert.equal(responses.length, 2)
  assert(responses.every((response) => response.bodyUsed))
  for (const result of results) {
    assert.equal(result.error, null)
    assert.deepEqual(result.data, [{ id: 'public-celeb' }])
  }
})

test('preserves Request cancellation unless init explicitly overrides it', async (t) => {
  const requestController = new AbortController()
  const request = new Request('https://images.example.test/cover', { signal: requestController.signal })
  const override = new AbortController()
  const signals: Array<AbortSignal | null | undefined> = []
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.strictEqual(input, request)
    signals.push(init?.signal)
    return new Response('ok')
  })
  await rawFetch(request)
  await rawFetch(request, { signal: override.signal })
  await rawFetch(request, { signal: null })
  assert.strictEqual(signals[0], request.signal)
  assert.strictEqual(signals[1], override.signal)
  assert(signals[2] instanceof AbortSignal)
  requestController.abort()
  assert.equal(signals[0]?.aborted, true)
  assert.equal(signals[2]?.aborted, false, 'explicit null clears the Request signal')
})

test('propagates native fetch aborts and leaves unpatched fetch usable', async () => {
  const response = await rawFetch('data:text/plain,unpatched')
  assert.equal(await response.text(), 'unpatched')
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(rawFetch('data:text/plain,cancelled', { signal: controller.signal }), {
    name: 'AbortError',
  })
})
