import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'
import { createClient } from '@supabase/supabase-js'

import { createRestFetch, REST_TIMEOUT_MS, withoutRestRetry } from './restFetch'

/** 응답을 영영 보내지 않는 PostgREST. 실제 소켓처럼 이벤트 루프를 붙든다(AbortSignal.timeout 타이머는 unref다). */
function stallFetch(t: TestContext) {
  return t.mock.method(globalThis, 'fetch', (_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      const socket = setTimeout(() => reject(new Error('test socket expired')), 10_000)
      init?.signal?.addEventListener('abort', () => { clearTimeout(socket); reject(init.signal!.reason) })
    }))
}

test('a request without a signal is aborted after the timeout', async (t) => {
  stallFetch(t)
  await assert.rejects(createRestFetch(20)('https://db.example.test/rest/v1/celebs'), { name: 'TimeoutError' })
})

test('an explicit signal is passed through untouched', async (t) => {
  const controller = new AbortController()
  let received: AbortSignal | null | undefined
  t.mock.method(globalThis, 'fetch', async (_input: RequestInfo | URL, init?: RequestInit) => {
    received = init?.signal
    return new Response('ok')
  })
  await createRestFetch(20)('https://db.example.test/rest/v1/celebs', { signal: controller.signal })
  assert.strictEqual(received, controller.signal)
})

function serverClient() {
  return withoutRestRetry(createClient('https://db.example.test', 'test-only', {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: createRestFetch(20) },
  }))
}

test('a stalled PostgREST call surfaces as a query error once, without retries', async (t) => {
  const stalled = stallFetch(t)
  const started = Date.now()
  const { data, error } = await serverClient().from('celebs').select('id')
  assert.equal(data, null)
  assert.match(error?.message ?? '', /TimeoutError/)
  assert.equal(stalled.mock.callCount(), 1, 'postgrest-js must not retry the timed-out request')
  assert(Date.now() - started < 1_000)
})

test('a 503 from the gateway is not retried against the saturated pool', async (t) => {
  const failing = t.mock.method(globalThis, 'fetch', async () =>
    new Response('{"message":"no healthy upstream"}', { status: 503, headers: { 'content-type': 'application/json' } }))
  const { data, error } = await serverClient().from('celebs').select('id')
  assert.equal(data, null)
  assert.match(error?.message ?? '', /no healthy upstream/)
  assert.equal(failing.mock.callCount(), 1)
})

test('the default budget covers pool wait plus the anon statement timeout', () => {
  assert(REST_TIMEOUT_MS > 25_000 && REST_TIMEOUT_MS < 100_000)
})
