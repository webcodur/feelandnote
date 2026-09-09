import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test, { type TestContext } from 'node:test'
import type { NextRequest as NextRequestType } from 'next/server'
import ts from 'typescript'
import { cloudflarePurgeExpectationForTags } from '@feelandnote/shared/constants/cache-tags'

// Keep Next's cache storage, tag timestamps, revalidateTag and unstable_cache real.
// Only disk IO, Cloudflare and the slow data source are replaced; no dev server is touched.
Object.assign(globalThis, { AsyncLocalStorage })
const require = createRequire(import.meta.url)
const { NextRequest } = require('next/server')
const { IncrementalCache } = require('next/dist/server/lib/incremental-cache')
const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external')
const { workUnitAsyncStorage } = require('next/dist/server/app-render/work-unit-async-storage.external')
const { executeRevalidates } = require('next/dist/server/revalidation-utils')
const { defaultConfig } = require('next/dist/server/config-shared')
const { unstable_cache } = require('next/cache')
const { tagsManifest } = require('next/dist/server/lib/incremental-cache/tags-manifest.external')

type Store = {
  route: string
  incrementalCache: unknown
  cacheLifeProfiles: unknown
  pendingRevalidates?: Record<string, Promise<unknown>>
}

function fixture(t: TestContext) {
  const original = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'runtime-test-secret'
  tagsManifest.clear()
  let now = Date.now()
  t.mock.method(Date, 'now', () => ++now)
  t.after(() => {
    if (original === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = original
    tagsManifest.clear()
  })
  const incrementalCache = new IncrementalCache({
    dev: false,
    flushToDisk: false,
    serverDistDir: 'unused-runtime-test-cache',
    fs: { readFile: async () => { throw new Error('No fixture disk cache') } },
    requestHeaders: {},
    maxMemoryCacheSize: 1024 * 1024,
    getPrerenderManifest: () => ({ version: 4, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: { previewModeId: 'fixture' } }),
  })
  function start<T>(callback: () => Promise<T>, route = '/explore', phase = 'render') {
    const store: Store = { route, incrementalCache, cacheLifeProfiles: defaultConfig.cacheLife }
    const unit = { type: 'request', phase, url: { pathname: route, search: '' } }
    const result = workAsyncStorage.run(store, () => workUnitAsyncStorage.run(unit, callback)) as Promise<T>
    return { result, store }
  }
  async function drain(store: Store) { await executeRevalidates(store) }
  const purgeByTags = async (tags: string[]) => {
    const expected = cloudflarePurgeExpectationForTags(tags)
    return {
      ...expected,
      ...(expected.mode === 'prefix' ? {} : { prefixes: undefined }),
      ok: true,
      status: expected.mode === 'none' ? 'not_needed' : 'purged',
    }
  }
  function loadRoute(endpoint: 'targeted' | 'bulk') {
    const url = new URL(endpoint === 'targeted' ? './route.ts' : './v2/route.ts', import.meta.url)
    const compiled = ts.transpileModule(readFileSync(url, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const loaded = { exports: {} as { POST: (request: NextRequestType) => Promise<Response> } }
    new Function('require', 'module', 'exports', compiled)(
      (id: string) => id === '@/lib/cloudflarePurge' ? { purgeCloudflareByTags: purgeByTags }
        : id === './handler' || id === '../handler' ? require('./handler') : require(id),
      loaded, loaded.exports,
    )
    return loaded.exports.POST
  }
  async function invalidate(tags: string[], endpoint: 'targeted' | 'bulk' = 'targeted') {
    const post = loadRoute(endpoint)
    const pending = start(() => post(new NextRequest('https://feelandnote.com/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ tag: tags, secret: process.env.CRON_SECRET }),
    })), '/api/revalidate', 'action')
    const response = await pending.result
    assert.equal(response.status, 200, JSON.stringify(await response.json()))
    await drain(pending.store)
  }
  function source(tags: string[]) {
    let version = 1
    let calls = 0
    let release!: () => void
    let pause: Promise<void> | undefined
    const read = unstable_cache(async () => {
      calls++
      const value = version
      await pause
      return value
    }, [randomUUID()], { tags, revalidate: 3600 }) as () => Promise<number>
    return {
      read,
      calls: () => calls,
      pause: () => { version++; pause = new Promise<void>(resolve => { release = resolve }) },
      release: () => { pause = undefined; release() },
    }
  }
  async function warm(read: () => Promise<number>) {
    const pending = start(read)
    assert.equal(await pending.result, 1)
    await drain(pending.store)
  }
  return { start, drain, source, invalidate, warm }
}

test('targeted domain invalidation serves the warm list before the slow Next refresh completes', async (t) => {
  const f = fixture(t)
  const source = f.source(['celebs'])
  await f.warm(source.read)
  source.pause()
  await f.invalidate(['celebs'])
  const pending = f.start(source.read)
  let received: number | undefined
  void pending.result.then(value => { received = value })
  try {
    await new Promise<void>(resolve => setImmediate(resolve))
    assert.equal(received, 1, 'warm list must render while the data source is still paused')
    assert.equal(source.calls(), 2, 'the stale read starts a background refresh')
    assert.ok(Object.keys(pending.store.pendingRevalidates ?? {}).length > 0)
  } finally {
    source.release()
    await pending.result
    await f.drain(pending.store)
  }
  const refreshed = f.start(source.read)
  assert.equal(await refreshed.result, 2)
  await f.drain(refreshed.store)
  assert.equal(source.calls(), 2)
})

test('targeted detail expires immediately even when its broad tag is also present', async (t) => {
  const f = fixture(t)
  const source = f.source(['celebs', 'celebs:bill-gates'])
  await f.warm(source.read)
  source.pause()
  await f.invalidate(['celebs', 'celebs:bill-gates'])
  const pending = f.start(source.read)
  let received: number | undefined
  void pending.result.then(value => { received = value })
  try {
    await new Promise<void>(resolve => setImmediate(resolve))
    assert.equal(received, undefined, 'detail must not serve the pre-edit value')
  } finally { source.release() }
  assert.equal(await pending.result, 2)
  await f.drain(pending.store)
})

test('v2 bulk keeps both broad lists and detail tags immediately expired', async (t) => {
  const f = fixture(t)
  const sources = [f.source(['celebs']), f.source(['celebs:__all__']), f.source(['celebs:bill-gates'])]
  for (const source of sources) { await f.warm(source.read); source.pause() }
  await f.invalidate(['celebs', 'celebs:__all__', 'celebs:bill-gates'], 'bulk')
  const pending = sources.map(source => f.start(source.read))
  const received: (number | undefined)[] = sources.map(() => undefined)
  pending.forEach((request, index) => { void request.result.then(value => { received[index] = value }) })
  try {
    await new Promise<void>(resolve => setImmediate(resolve))
    assert.deepEqual(received, [undefined, undefined, undefined])
  } finally { sources.forEach(source => source.release()) }
  assert.deepEqual(await Promise.all(pending.map(request => request.result)), [2, 2, 2])
  await Promise.all(pending.map(request => f.drain(request.store)))
})
