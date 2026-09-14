import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import * as purchase from '../../lib/books/yes24Purchase'
import type { AffiliateLink } from '../../constants/affiliatePlatforms'

Object.assign(globalThis, { AsyncLocalStorage })
const require = createRequire(import.meta.url)
const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external')
const { workUnitAsyncStorage } = require('next/dist/server/app-render/work-unit-async-storage.external')
const compiled = ts.transpileModule(readFileSync(new URL('./getYes24PurchaseLink.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText
const id = 'c53aab37-7ed8-42b6-9f06-929b8825c006'
const isbn = '9788966260959'

function fixture() {
  const rows: Record<string, Record<string, unknown> | null> = {
    contents: { id, type: 'BOOK' },
    content_locales: { content_id: id, locale: 'ko', isbn },
    figure_book_editions: { id: 1, content_id: id, locale: 'ko', isbn },
  }
  const queries: { table: string; filters: Record<string, unknown> }[] = []
  const entries = new Map<string, { value: unknown; isStale: boolean }>()
  let fails = false
  let calls = 0
  const mocks: Record<string, unknown> = {
    '@/lib/books/yes24Purchase': purchase,
    '@/lib/db/static': { createStaticClient: () => ({ from: (table: string) => {
      const query = { table, filters: {} as Record<string, unknown> }
      queries.push(query)
      const builder = { select: () => builder, eq: (key: string, value: unknown) => { query.filters[key] = value; return builder },
        maybeSingle: async () => ({ data: rows[table], error: null }) }
      return builder
    } }) },
    '@/lib/rawFetch': { rawFetch: async () => {
      calls++
      if (fails) return new Response('', { status: 503 })
      return Response.json({ success: true, data: { items: [{ itemId: 123, isbn13: isbn, goodsType: '도서', itemStatus: '판매중', link: 'https://www.yes24.com/product/goods/123' }] } })
    } },
  }
  const loaded = { exports: {} as { getYes24PurchaseLink: (id: string, locale: string, editionId?: number) => Promise<AffiliateLink | null> } }
  new Function('require', 'module', 'exports', 'process', compiled)((key: string) => mocks[key] ?? require(key), loaded, loaded.exports,
    { env: { NODE_ENV: 'development', YES24_API_KEY: 'test-only' } })
  const incrementalCache = {
    generateCacheKey: async (key: string) => key,
    get: async (key: string) => entries.get(key) ?? null,
    set: async (key: string, value: unknown) => { entries.set(key, { value, isStale: false }) },
  }
  async function read(editionId?: number, locale = 'ko') {
    const store = { route: '/content', incrementalCache, pendingRevalidates: {} as Record<string, Promise<unknown>> }
    const result = await workAsyncStorage.run(store, () => workUnitAsyncStorage.run(
      { type: 'prerender-legacy', phase: 'render', tags: null, revalidate: Infinity },
      () => loaded.exports.getYes24PurchaseLink(id, locale, editionId),
    ))
    await Promise.allSettled(Object.values(store.pendingRevalidates))
    return result
  }
  return { read, rows, queries, entries, calls: () => calls, fail: () => { fails = true }, recover: () => { fails = false },
    expire: () => { for (const entry of entries.values()) entry.isStale = true } }
}

test('registered Korean edition ISBN is reused across Next cached purchase requests', async () => {
  const f = fixture()
  assert.equal((await f.read())?.platform, 'yes24')
  assert.equal((await f.read(1))?.platform, 'yes24')
  assert.equal(f.calls(), 1)
  assert.deepEqual(f.queries.find(query => query.table === 'figure_book_editions')?.filters, { id: 1, content_id: id, locale: 'ko' })
  assert.ok([...f.entries.keys()].some(key => key.includes(isbn)))
  assert.ok([...f.entries.keys()].every(key => !key.includes('test-only')))
})
test('edition belonging to another content or language cannot supply an ISBN', async () => {
  for (const change of [{ content_id: 'another-content' }, { locale: 'en' }, { id: 2 }]) {
    const f = fixture()
    f.rows.figure_book_editions = { ...f.rows.figure_book_editions, ...change }
    assert.equal(await f.read(1), null)
    assert.equal(f.calls(), 0)
  }
})
test('missing exact locale, missing content, and non-book never fall back to another edition', async () => {
  const missing = fixture()
  missing.rows.content_locales = null
  assert.equal(await missing.read(), null)
  assert.equal(missing.calls(), 0)
  for (const value of [null, { id, type: 'VIDEO' }]) {
    const f = fixture()
    f.rows.contents = value
    assert.equal(await f.read(), null)
    assert.equal(f.calls(), 0)
  }
  const english = fixture()
  assert.equal(await english.read(undefined, 'en'), null)
  assert.equal(english.queries.length, 0)
})
test('a cold API outage is not cached and a successful retry recovers', async () => {
  const f = fixture()
  f.fail()
  assert.equal(await f.read(), null)
  assert.equal(f.entries.size, 0)
  f.recover()
  assert.equal((await f.read())?.platform, 'yes24')
})
test('failed refresh keeps last success but hides it beyond maximum age', async t => {
  let now = Date.now()
  t.mock.method(Date, 'now', () => now)
  const f = fixture()
  await f.read()
  f.fail(); f.expire()
  assert.equal((await f.read())?.platform, 'yes24')
  now += purchase.YES24_PURCHASE_MAX_AGE_MS + 1
  assert.equal(await f.read(), null)
})
