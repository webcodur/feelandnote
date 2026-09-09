import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

// Exercise the installed Next implementation, with only the DB boundary replaced.
Object.assign(globalThis, { AsyncLocalStorage })
const require = createRequire(import.meta.url)
const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external')
const { workUnitAsyncStorage } = require('next/dist/server/app-render/work-unit-async-storage.external')
const viewerStorage = new AsyncLocalStorage<string>()
const sourceUrl = new URL('./getCelebs.ts', import.meta.url)
const source = readFileSync(sourceUrl, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

type Entry = { value: { data: { body: string } }; isStale: boolean; tags: string[] }
type Store = { route: string; incrementalCache: unknown; pendingRevalidates?: Record<string, Promise<unknown>> }

function fixture() {
  const entries = new Map<string, Entry>()
  const counts = { lists: 0, ranking: 0, auth: 0 }
  let failList = false
  let failRanking = false
  let pause: Promise<void> | undefined
  const incrementalCache = {
    generateCacheKey: async (key: string) => key,
    get: async (key: string) => entries.get(key) ?? null,
    set: async (key: string, value: Entry['value'], options: { tags: string[] }) => {
      entries.set(key, { value, isStale: false, tags: options.tags })
    },
  }
  const delay = () => pause ?? new Promise<void>(resolve => setImmediate(resolve))
  const row = (id: string) => ({ id, nickname: id, total_score: 90, content_count: 1 })
  function query(table: string, viewer = '') {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'gt', 'order', 'range', 'in', 'eq', 'overrideTypes']) {
      builder[method] = () => builder
    }
    builder.then = async (resolve: (value: unknown) => void, reject: (error: unknown) => void) => {
      try {
        if (table === 'celeb_influence') {
          counts.ranking++
          await delay()
          if (failRanking) throw new Error('ranking unavailable')
          return resolve({ data: [{ celeb_id: 'a', total_score: 90 }, { celeb_id: 'b', total_score: 80 }], error: null })
        }
        if (table === 'member_celeb_follows') return resolve({ data: [{ celeb_id: viewer }], error: null })
        return resolve({ data: [], error: null })
      } catch (error) { reject(error) }
    }
    return builder
  }
  const db = {
    from: (table: string) => query(table),
    rpc: async (name: string, args: Record<string, number>) => {
      if (name === 'count_celebs_filtered') return { data: 2, error: null }
      counts.lists++
      await delay()
      if (failList) throw new Error('list unavailable')
      return { data: [row(args.p_offset ? 'b' : 'a')], error: null }
    },
  }
  const mocks: Record<string, unknown> = {
    '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/db/server': {
      createClient: async () => {
        const viewer = viewerStorage.getStore() ?? ''
        return { from: (table: string) => query(table, viewer), auth: { getUser: async () => {
          counts.auth++
          return { data: { user: { id: viewer } } }
        } } }
      },
    },
    '@feelandnote/shared/lib/paginate': {
      selectAllPages: async (load: (from: number, to: number) => PromiseLike<{ data: unknown }>) => (await load(0, 999)).data,
    },
    '@/constants/materials': { getCelebLevelByRanking: (rank: number) => rank },
    '@/lib/utils/celeb-dialogues': { DIALOGUE_BRIEF_SELECT_WITH_ID: '*' },
  }
  const loaded = { exports: {} as {
    getCelebs: (params?: Record<string, unknown>) => Promise<{ celebs: { id: string; is_following: boolean }[] }>
    getInfluenceRanking: () => Promise<unknown>
  } }
  new Function('require', 'module', 'exports', compiled)(
    (id: string) => mocks[id] ?? require(id), loaded, loaded.exports,
  )
  function start<T>(callback: () => Promise<T>, viewer = 'a') {
    const store: Store = { route: '/fixture', incrementalCache }
    const unit = { type: 'prerender-legacy', phase: 'render', tags: null as string[] | null, revalidate: Infinity }
    const result = viewerStorage.run(viewer, () => workAsyncStorage.run(store, () => workUnitAsyncStorage.run(unit, callback))) as Promise<T>
    return { result, store, unit }
  }
  async function run<T>(callback: () => Promise<T>, viewer = 'a') {
    const pending = start(callback, viewer)
    const value = await pending.result
    await Promise.all(Object.values(pending.store.pendingRevalidates ?? {}))
    return value
  }
  return { ...loaded.exports, counts, entries, start, run,
    failList: (value: boolean) => { failList = value },
    failRanking: (value: boolean) => { failRanking = value },
    pause: (value?: Promise<void>) => { pause = value },
    invalidate: (tag: string) => { for (const [key, entry] of entries) if (entry.tags.includes(tag)) entries.delete(key) },
  }
}

test('12 cold requests share public reads, reuse warm ranking, and retain separate viewer state', async () => {
  const f = fixture()
  await f.run(() => f.getInfluenceRanking())
  const requests = Array.from({ length: 12 }, (_, i) => f.start(() => f.getCelebs(), i % 2 ? 'b' : 'a'))
  const results = await Promise.all(requests.map(request => request.result))
  await Promise.all(requests.flatMap(request => Object.values(request.store.pendingRevalidates ?? {})))
  assert.equal(f.counts.lists, 1)
  assert.equal(f.counts.ranking, 1)
  assert.equal(f.counts.auth, 12)
  results.forEach((result, i) => assert.equal(result.celebs[0].is_following, i % 2 === 0))
  for (const request of requests) {
    for (const tag of ['celebs', 'contents', 'dialogues', 'tags']) assert.ok(request.unit.tags?.includes(tag))
  }
  for (const [key, entry] of f.entries) {
    if (key.includes('celebs-public')) assert.equal('rankingMap' in JSON.parse(entry.value.data.body), false)
  }
})

test('different public arguments remain separate and settled reads are not retained after invalidation', async () => {
  const f = fixture()
  const values = await Promise.all([1, 2].flatMap(page => Array.from({ length: 6 }, () =>
    f.run(() => f.getCelebs({ page, limit: 1, includeViewerState: false })),
  )))
  assert.equal(f.counts.lists, 2)
  assert.equal(f.counts.ranking, 1)
  assert.equal(f.counts.auth, 0)
  assert.deepEqual(new Set(values.map(result => result.celebs[0].id)), new Set(['a', 'b']))
  f.invalidate('celebs')
  await f.run(() => f.getCelebs({ page: 1, limit: 1, includeViewerState: false }))
  assert.equal(f.counts.lists, 3)
  assert.equal(f.counts.ranking, 2)
})

test('failed pending list and ranking reads are removed and can retry', async () => {
  for (const target of ['list', 'ranking'] as const) {
    const f = fixture()
    const setFailure = target === 'list' ? f.failList : f.failRanking
    setFailure(true)
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => f.run(() =>
      target === 'list' ? f.getCelebs({ includeViewerState: false }) : f.getInfluenceRanking(),
    )))
    assert.ok(results.every(result => result.status === 'rejected'))
    assert.equal(target === 'list' ? f.counts.lists : f.counts.ranking, 1)
    setFailure(false)
    await f.run(() => target === 'list' ? f.getCelebs({ includeViewerState: false }) : f.getInfluenceRanking())
    assert.equal(target === 'list' ? f.counts.lists : f.counts.ranking, 2)
  }
})

test('stale reads return immediately while one public refresh runs across requests', { timeout: 3000 }, async () => {
  const f = fixture()
  await f.run(() => f.getCelebs({ includeViewerState: false }))
  for (const entry of f.entries.values()) entry.isStale = true
  let release!: () => void
  f.pause(new Promise<void>(resolve => { release = resolve }))
  const requests = Array.from({ length: 12 }, () => f.start(() => f.getCelebs({ includeViewerState: false })))
  try {
    const values = await Promise.all(requests.map(request => request.result))
    assert.ok(values.every(value => value.celebs[0].id === 'a'))
    assert.equal(f.counts.lists, 2)
    assert.equal(f.counts.ranking, 2)
    assert.ok(requests.every(request => Object.keys(request.store.pendingRevalidates ?? {}).length > 0))
  } finally { release() }
  await Promise.all(requests.flatMap(request => Object.values(request.store.pendingRevalidates ?? {})))
  f.pause()
  assert.ok([...f.entries.values()].every(entry => !entry.isStale))
})
