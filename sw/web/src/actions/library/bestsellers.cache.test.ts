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
const bundled = JSON.parse(readFileSync(new URL('../../constants/library/bestsellers.json', import.meta.url), 'utf8'))
const compiled = ts.transpileModule(readFileSync(new URL('./bestsellers.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText

function fixture() {
  const entries = new Map<string, { value: unknown; isStale: boolean }>()
  let payload = structuredClone(bundled)
  let fails = false
  let calls = 0
  const mocks: Record<string, unknown> = {
    '@/constants/library/bestsellers.json': bundled,
    '@/lib/library/bestsellerFeed': feed,
    '@/lib/rawFetch': { rawFetch: async () => {
      calls++
      return new Response(fails ? '' : JSON.stringify(payload), { status: fails ? 503 : 200 })
    } },
  }
  const loaded = { exports: {} as { getBestsellers: (category: string, locale: string) => Promise<{ updatedAt: string; items: { title: string }[] }> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  const incrementalCache = {
    generateCacheKey: async (key: string) => key,
    get: async (key: string) => entries.get(key) ?? null,
    set: async (key: string, value: unknown) => { entries.set(key, { value, isStale: false }) },
  }
  async function read() {
    const store = { route: '/library', incrementalCache, pendingRevalidates: {} as Record<string, Promise<unknown>> }
    const result = await workAsyncStorage.run(store, () => workUnitAsyncStorage.run(
      { type: 'prerender-legacy', phase: 'render', tags: null, revalidate: Infinity },
      () => loaded.exports.getBestsellers('ALL', 'ko'),
    ))
    await Promise.allSettled(Object.values(store.pendingRevalidates))
    return result
  }
  return { read, entries, calls: () => calls, fail: (value: boolean) => { fails = value },
    publish: (title: string) => { payload = structuredClone(bundled); payload.ko.categories.ALL[0].title = title },
    expire: () => { for (const entry of entries.values()) entry.isStale = true },
  }
}

test('the real action picks up publication after Next cache expiry without reloading its module', async () => {
  const f = fixture()
  f.publish('First publication')
  assert.equal((await f.read()).items[0].title, 'First publication')
  f.publish('Next publication')
  assert.equal((await f.read()).items[0].title, 'First publication')
  assert.equal(f.calls(), 1)
  f.expire()
  await f.read()
  assert.equal((await f.read()).items[0].title, 'Next publication')
})

test('failed background refresh preserves the last successful publication', async () => {
  const f = fixture()
  f.publish('Last successful publication')
  await f.read()
  f.fail(true); f.expire()
  assert.equal((await f.read()).items[0].title, 'Last successful publication')
  assert.equal((await f.read()).items[0].title, 'Last successful publication')
})

test('a cold-cache failure uses bundled data without caching the failure and recovers next request', async () => {
  const f = fixture()
  f.fail(true)
  assert.equal((await f.read()).items[0].title, bundled.ko.categories.ALL[0].title)
  assert.equal(f.entries.size, 0)
  f.fail(false); f.publish('Recovered')
  assert.equal((await f.read()).items[0].title, 'Recovered')
})
