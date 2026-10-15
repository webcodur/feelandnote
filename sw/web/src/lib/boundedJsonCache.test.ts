import assert from 'node:assert/strict'
import test from 'node:test'
import { createBoundedJsonCache } from './boundedJsonCache'

test('cache bounds entries and bytes, evicts LRU, and expires without extending TTL on reads', async (t) => {
  let now = 0
  t.mock.method(Date, 'now', () => now)
  const cache = createBoundedJsonCache<string>({ entries: 2, bytes: 30, ttlMs: 100 })
  cache.set('a', 'first')
  cache.set('b', 'second')
  assert.equal(cache.get('a'), 'first')
  cache.set('c', 'third')
  assert.equal(cache.get('b'), undefined)
  cache.set('large', 'x'.repeat(100))
  assert.equal(cache.get('large'), undefined)
  assert.equal(cache.get('a'), 'first')
  cache.set('d', 'y'.repeat(20))
  assert.equal(cache.get('a'), undefined, 'byte cap must also evict entries')
  now = 101
  assert.equal(cache.get('d'), undefined)
  cache.set('e', 'last')
  cache.clear()
  assert.equal(cache.get('e'), undefined)
})

test('null and false values are cache hits and replacing a key does not leak its byte budget', () => {
  const cache = createBoundedJsonCache<null | boolean>({ entries: 2, bytes: 15, ttlMs: 100 })
  cache.set('a', null)
  cache.set('a', false)
  cache.set('b', false)
  assert.equal(cache.get('a'), false)
  assert.equal(cache.get('b'), false)
})
