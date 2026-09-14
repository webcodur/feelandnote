import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import * as feed from '../../lib/library/bestsellerFeed'

Object.assign(globalThis, { AsyncLocalStorage })
const require = createRequire(import.meta.url)
const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external')
const { workUnitAsyncStorage } = require('next/dist/server/app-render/work-unit-async-storage.external')
const compiled = ts.transpileModule(readFileSync(new URL('./bestsellers.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText

function fixture(environment: { YES24_API_KEY?: string; YES24_CHARTS_ENABLED?: string; NODE_ENV?: string } = {}) {
  const entries = new Map<string, { value: unknown; isStale: boolean }>()
  let title = 'First chart'
  let fails = false
  let calls = 0
  const dates: string[] = []
  const mocks: { [key: string]: unknown } = {
    '@/lib/library/bestsellerFeed': feed,
    '@/lib/rawFetch': { rawFetch: async (url: string) => {
      calls++
      if (fails) return new Response('', { status: 503 })
      const now = new Date().toISOString()
      if (url.includes('yes24.com')) {
        const date = new URL(url).searchParams.get('date')!
        dates.push(date)
        return Response.json({ success: true, data: { meta: { apiLink: url, pubDate: now },
          items: [{ itemId: 1, sortOrder: 1, title, author: 'Author', goodsType: '도서', isbn13: '9788966260959',
            cover: 'https://image.yes24.com/goods/1/L', link: 'https://www.yes24.com/product/goods/1' }] } })
      }
      return Response.json({ feed: { id: feed.APPLE_BOOKS_FEED_URL, country: 'us', updated: now,
        results: [{ id: '1', kind: 'books', name: title, artistName: 'Author',
          artworkUrl100: 'https://is1-ssl.mzstatic.com/book.png', url: 'https://books.apple.com/us/book/book/id1' }] } })
    } },
  }
  const loaded = { exports: {} as { getBestsellers: (category: string, locale: string) => Promise<feed.BookChartSelection> } }
  new Function('require', 'module', 'exports', 'process', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports, { env: environment })
  const incrementalCache = {
    generateCacheKey: async (key: string) => key,
    get: async (key: string) => entries.get(key) ?? null,
    set: async (key: string, value: unknown) => { entries.set(key, { value, isStale: false }) },
  }
  async function read(locale = 'en') {
    const store = { route: '/library', incrementalCache, pendingRevalidates: {} as { [key: string]: Promise<unknown> } }
    const result = await workAsyncStorage.run(store, () => workUnitAsyncStorage.run(
      { type: 'prerender-legacy', phase: 'render', tags: null, revalidate: Infinity },
      () => loaded.exports.getBestsellers('ALL', locale),
    ))
    await Promise.allSettled(Object.values(store.pendingRevalidates))
    return result
  }
  return { read, entries, dates, calls: () => calls, fail: (value: boolean) => { fails = value },
    publish: (value: string) => { title = value },
    expire: () => { for (const entry of entries.values()) entry.isStale = true },
  }
}

test('real action refreshes official Apple data after Next cache expires', async () => {
  const f = fixture()
  assert.equal((await f.read()).items[0].title, 'First chart')
  f.publish('Next chart')
  assert.equal((await f.read()).items[0].title, 'First chart')
  assert.equal(f.calls(), 1)
  f.expire(); await f.read()
  assert.equal((await f.read()).items[0].title, 'Next chart')
})
test('failed background refresh retains the last successful official chart', async () => {
  const f = fixture()
  await f.read()
  f.fail(true); f.expire()
  assert.equal((await f.read()).items[0].title, 'First chart')
  assert.equal((await f.read()).items[0].title, 'First chart')
})
test('cold failure is unavailable without a legacy snapshot and recovers next request', async () => {
  const f = fixture()
  f.fail(true)
  assert.equal((await f.read()).status, 'unavailable')
  assert.equal(f.entries.size, 0)
  f.fail(false); f.publish('Recovered')
  assert.equal((await f.read()).items[0].title, 'Recovered')
})
test('disabled or missing YES24 credentials never call a source', async () => {
  for (const env of [{}, { NODE_ENV: 'production', YES24_API_KEY: 'test-only' }, { YES24_CHARTS_ENABLED: 'true' }]) {
    const f = fixture(env)
    assert.equal((await f.read('ko')).status, 'unavailable')
    assert.equal(f.calls(), 0)
    assert.equal(f.entries.size, 0)
  }
})
test('a new KST day fetches a new Korean chart without waiting for old cache expiry', async t => {
  let clock = Date.now()
  t.mock.method(Date, 'now', () => clock)
  const f = fixture({ NODE_ENV: 'production', YES24_API_KEY: 'test-only', YES24_CHARTS_ENABLED: 'true' })
  const result = await f.read('ko')
  const basis = feed.previousKoreanDate()
  assert.equal(result.basisDate, basis)
  assert.deepEqual(f.dates, [basis])
  assert.ok([...f.entries.keys()].some(key => key.includes(basis)))
  clock += 24 * 3600_000
  const next = await f.read('ko')
  assert.notEqual(next.basisDate, basis)
  assert.equal(f.calls(), 2)
  assert.equal(f.entries.size, 2)
})
