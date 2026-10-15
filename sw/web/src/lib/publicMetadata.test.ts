import assert from 'node:assert/strict'
import test from 'node:test'
import { createMetadataCache, fetchMetadataJson, METADATA_LIMITS } from './publicMetadata'

test('metadata cache bounds retained entries and removes expired values', async (t) => {
  let now = 100
  t.mock.method(Date, 'now', () => now)
  const read = createMetadataCache<string>(10, { entries: 2, bytes: 100, concurrent: 2 })
  let calls = 0
  const load = async () => String(++calls)
  assert.equal(await read('a', load), '1')
  await read('b', load)
  assert.equal(await read('a', load), '1')
  await read('c', load)
  assert.equal(await read('b', load), '4', 'least recently used entry must be evicted')
  now += 11
  assert.equal(await read('b', load), '5')
})

test('metadata cache bounds bytes and distinct pending loads while joining identical loads', async () => {
  const read = createMetadataCache<string>(1000, { entries: 10, bytes: 10, concurrent: 1 })
  let finish!: (value: string) => void
  const first = read('a', () => new Promise(resolve => { finish = resolve }))
  const joined = read('a', () => { throw Error('must share') })
  await assert.rejects(read('b', async () => 'b'), /busy/)
  finish('a value that exceeds the cache byte budget')
  assert.equal(await first, await joined)
  assert.equal(await read('a', async () => 'new'), 'new')
  await assert.rejects(read('b', async () => { throw Error('upstream failed') }), /failed/)
  assert.equal(await read('b', async () => 'retry'), 'retry')
})

test('metadata fetch rejects oversized chunked bodies and cancels the stream', async (t) => {
  let cancelled = false
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(METADATA_LIMITS.responseBytes + 1)) },
    cancel() { cancelled = true },
  })))
  await assert.rejects(fetchMetadataJson('https://example.test/large', AbortSignal.timeout(1000)), /too large/)
  assert.equal(cancelled, true)
})

test('metadata deadline cancels a stalled response body', async (t) => {
  let cancelled = false
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({ cancel() { cancelled = true } })))
  const controller = new AbortController()
  const pending = fetchMetadataJson('https://example.test/stalled', controller.signal)
  setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), 10)
  await assert.rejects(pending, { name: 'TimeoutError' })
  assert.equal(cancelled, true)
})
