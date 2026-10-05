import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import test from 'node:test'
import { AFFILIATE_POOL_CHUNK_BYTES, AFFILIATE_POOL_SHARDS, affiliatePoolShard, createAffiliatePoolCache } from './affiliatePoolCache'

Object.assign(globalThis, { AsyncLocalStorage })
const require = createRequire(import.meta.url)
const { unstable_cache } = require('next/cache') as typeof import('next/cache')
const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external')
const { workUnitAsyncStorage } = require('next/dist/server/app-render/work-unit-async-storage.external')
type Book = { book: { contentId: string; title: string }; modernCount: number; userCount: number }
type Value = { data: { body: string } }
type Cached = { value: Value; isStale: boolean; tags: string[] }

function fixture(initial: Book[]) {
  const entries = new Map<string, Cached>()
  const reads = new Map<string, number>()
  let pool = initial
  let fail = false
  let delayMisses = false
  let largestItem = 0
  const incrementalCache = {
    generateCacheKey: async (key: string) => key,
    get: async (key: string) => {
      if (delayMisses && !entries.has(key) && /-\[(?:1[6-9]|2\d|3[01])\]$/.test(key)) {
        await new Promise(resolve => setTimeout(resolve, 30))
      }
      return entries.get(key) ?? null
    },
    set: async (key: string, value: Value, options: { tags?: string[] }) => {
      const size = Buffer.byteLength(JSON.stringify(value))
      largestItem = Math.max(largestItem, size)
      assert.ok(size < 2 * 1024 * 1024, `oversized cache entry: ${size}`)
      entries.set(key, { value, isStale: false, tags: options.tags ?? [] })
    },
  }
  const get = createAffiliatePoolCache(async (locale: string) => {
    reads.set(locale, (reads.get(locale) ?? 0) + 1)
    await new Promise<void>(resolve => setImmediate(resolve))
    if (fail) throw new Error('DB unavailable')
    return pool
  }, unstable_cache, ['affiliate-pool-test'], { revalidate: 60, tags: ['figure-books'] })
  async function run(locale = 'ko') {
    const store = { route: `/${locale}`, incrementalCache, pendingRevalidates: {} as { [key: string]: Promise<unknown> } }
    const unit = { type: 'prerender-legacy', phase: 'render', tags: null, revalidate: Infinity }
    const result = await workAsyncStorage.run(store, () => workUnitAsyncStorage.run(unit, () => get(locale)))
    await Promise.all(Object.values(store.pendingRevalidates))
    return result as Book[]
  }
  return { run, reads, entries, largest: () => largestItem, fail: (value: boolean) => { fail = value },
    delayMisses: () => { delayMisses = true },
    replace: (value: Book[]) => { pool = value },
    invalidate: () => { for (const [key, entry] of entries) if (entry.tags.includes('figure-books')) entries.delete(key) },
  }
}

const pool: Book[] = Array.from({ length: 120 }, (_, i) => ({
  book: { contentId: `book-${119 - i}`, title: `도서 ${i}` }, modernCount: i % 3, userCount: i % 5,
})).sort((a, b) => b.modernCount - a.modernCount || b.userCount - a.userCount)

test('hash assignment is deterministic, bounded, and distributes candidates across 32 shards', () => {
  const shards = pool.map(entry => affiliatePoolShard(entry.book.contentId))
  assert.deepEqual(shards, pool.map(entry => affiliatePoolShard(entry.book.contentId)))
  assert.ok(shards.every(shard => shard >= 0 && shard < AFFILIATE_POOL_SHARDS))
  assert.equal(new Set(Array.from({ length: 1000 }, (_, i) => affiliatePoolShard(`book-${i}`))).size, AFFILIATE_POOL_SHARDS)
  for (const id of ['', '한글 도서 📚', 'x'.repeat(1000)]) assert.equal(affiliatePoolShard(id), affiliatePoolShard(id))
})

test('cold concurrent requests compute once per locale; warm reads preserve all entries and exact ties', async () => {
  const f = fixture(pool)
  const results = await Promise.all(Array.from({ length: 6 }, () => f.run()))
  results.forEach(result => assert.deepEqual(result, pool))
  assert.equal(f.reads.get('ko'), 1)
  assert.deepEqual(await f.run(), pool)
  assert.equal(f.reads.get('ko'), 1)
  assert.equal(f.entries.size, AFFILIATE_POOL_SHARDS)
  f.invalidate()
  await Promise.all([f.run('ko'), f.run('en')])
  assert.equal(f.reads.get('ko'), 2)
  assert.equal(f.reads.get('en'), 1)
})

test('partial misses reuse one snapshot even when source work already finished; failures can retry', async () => {
  const f = fixture(pool)
  f.fail(true)
  await assert.rejects(f.run(), /DB unavailable/)
  f.fail(false)
  f.delayMisses()
  assert.deepEqual(await f.run(), pool)
  assert.equal(f.reads.get('ko'), 2)
  const keys = [...f.entries.keys()]
  keys.slice(0, 5).forEach(key => f.entries.delete(key))
  assert.deepEqual(await f.run(), pool)
  assert.equal(f.reads.get('ko'), 3)
  assert.deepEqual(await f.run(), pool)
  assert.equal(f.reads.get('ko'), 3)
})

test('an oversized single book and growing colliding shards use bounded chunks and remain warm', async () => {
  const huge: Book = { book: { contentId: 'huge', title: randomBytes(3 * 1024 * 1024).toString('base64') }, modernCount: 1, userCount: 1 }
  const f = fixture([huge])
  assert.deepEqual(await f.run(), [huge])
  assert.equal(f.reads.get('ko'), 1)
  assert.ok(f.largest() <= AFFILIATE_POOL_CHUNK_BYTES + 1024)
  const chunks = [...f.entries.keys()].filter(key => key.includes(',chunk,'))
  assert.ok(chunks.length >= 4)
  assert.deepEqual(await f.run(), [huge])
  assert.equal(f.reads.get('ko'), 1)
  f.entries.delete(chunks[0])
  assert.deepEqual(await f.run(), [huge])
  assert.equal(f.reads.get('ko'), 2)
  assert.deepEqual(await f.run(), [huge])
  assert.equal(f.reads.get('ko'), 2)

  const collidingIds = Array.from({ length: 1000 }, (_, i) => `growth-${i}`)
    .filter(id => affiliatePoolShard(id) === affiliatePoolShard('huge')).slice(0, 8)
  const grown = [huge, ...collidingIds.map(contentId => ({ ...huge, book: { contentId, title: randomBytes(256 * 1024).toString('base64') } }))]
  f.replace(grown)
  f.invalidate()
  assert.deepEqual(await f.run(), grown)
  assert.equal(f.reads.get('ko'), 3)
  assert.deepEqual(await f.run(), grown)
  assert.equal(f.reads.get('ko'), 3)
  assert.ok(f.largest() <= AFFILIATE_POOL_CHUNK_BYTES + 1024)
})

test('eviction of an old snapshot chunk never joins bytes from different generations', async () => {
  const huge: Book = { book: { contentId: 'huge', title: randomBytes(2 * 1024 * 1024).toString('base64') }, modernCount: 1, userCount: 1 }
  const f = fixture([huge])
  await f.run()
  for (const key of f.entries.keys()) if (key.includes(',chunk,')) f.entries.delete(key)
  f.replace(pool)
  assert.deepEqual(await f.run(), pool)
  assert.equal(f.reads.get('ko'), 2)
  assert.deepEqual(await f.run(), pool)
  assert.equal(f.reads.get('ko'), 2)
})

test('empty pools are cached without changing the result', async () => {
  const f = fixture([])
  assert.deepEqual(await f.run(), [])
  assert.deepEqual(await f.run(), [])
  assert.equal(f.reads.get('ko'), 1)
})
