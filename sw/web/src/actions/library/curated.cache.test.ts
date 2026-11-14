import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

Object.assign(globalThis, { AsyncLocalStorage })
const require = createRequire(import.meta.url)
const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external')
const { workUnitAsyncStorage } = require('next/dist/server/app-render/work-unit-async-storage.external')
const compiled = ts.transpileModule(readFileSync(new URL('./curated.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

// Use the installed Next cache and real query-error guard; replace only DB and locale inputs.
function fixture(itemRows: Record<string, unknown>[] = []) {
  type Entry = { value: unknown; isStale: boolean }
  const entries = new Map<string, Entry>()
  let failedTable: string | undefined
  let missing = false
  let calls = 0
  const curator = { id: 'university', slug: 'yonsei-university', name: '연세대학교' }
  const list = { id: 'list', slug: 'classics', curator_id: curator.id, title: '고전', source_url: 'https://example.com/source', curated_list_items: [{ count: 0 }] }
  const db = { from(table: string) {
    const builder: Record<string, unknown> = {}
    let single = false
    let start = 0
    let end = Infinity
    let limit = Infinity
    let publicOnly = false
    for (const method of ['select', 'in', 'lte', 'order']) builder[method] = () => builder
    builder.eq = (key: string, value: unknown) => { if (key === 'hidden' && value === false) publicOnly = true; return builder }
    builder.limit = (value: number) => { limit = value; return builder }
    builder.range = (from: number, to: number) => { start = from; end = to + 1; return builder }
    builder.maybeSingle = () => { single = true; return builder }
    builder.then = (resolve: (value: unknown) => void) => {
      calls++
      if (table === failedTable) return Promise.resolve(resolve({ data: null, error: { message: 'upstream connection timeout' } }))
      const allRows: Record<string, unknown>[] = table === 'curators' ? (missing ? [] : [curator]) : table === 'curated_lists' ? [list] : itemRows
      const publicRows = publicOnly ? allRows.filter(row => row.hidden !== true) : allRows
      const rows = publicRows.slice(start, Math.min(end, start + limit))
      return Promise.resolve(resolve({ data: single ? rows[0] ?? null : rows, error: null, count: publicRows.length }))
    }
    return builder
  } }
  const mocks: Record<string, unknown> = {
    '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/cache': require('../../lib/cache'),
    'next-intl/server': { getLocale: async () => 'ko' },
    '@/lib/utils/content-locale': { CL_SELECT_LIST: '*', flattenLocales: () => ({}) },
  }
  const loaded = { exports: {} as {
    getCuratorBySlug: (slug: string) => Promise<{ slug: string } | null>
    getCuratedHub: () => Promise<unknown>
    getCuratedList: (slug: string) => Promise<unknown>
    getCuratedListDownload: (curator: string, slug: string, locale: 'ko' | 'en') => Promise<import('@/lib/library/curatedListCsv').CuratedListCsvData | null>
  } }
  new Function('require', 'module', 'exports', compiled)(
    (id: string) => mocks[id] ?? require(id), loaded, loaded.exports,
  )
  const incrementalCache = {
    generateCacheKey: async (key: string) => key,
    generateSimpleCacheKey: (key: string) => key,
    get: async (key: string) => entries.get(key) ?? null,
    set: async (key: string, value: unknown) => { entries.set(key, { value, isStale: false }) },
  }
  function run<T>(callback: () => Promise<T>): Promise<T> {
    return workAsyncStorage.run({ route: '/fixture', incrementalCache }, () =>
      workUnitAsyncStorage.run({ type: 'prerender-legacy', phase: 'render', tags: null, revalidate: Infinity }, callback))
  }
  return { ...loaded.exports, entries, run, calls: () => calls,
    fail: (table?: string) => { failedTable = table },
    missing: () => { missing = true },
  }
}

for (const table of ['curators', 'curated_lists', 'curated_list_items']) {
  test(`curator ${table} failure is not cached; next request recovers`, async () => {
    const f = fixture()
    f.fail(table)
    await assert.rejects(f.run(() => f.getCuratorBySlug('yonsei-university')), /upstream connection timeout/)
    assert.equal(f.entries.size, 0)
    f.fail()
    assert.equal((await f.run(() => f.getCuratorBySlug('yonsei-university')))?.slug, 'yonsei-university')
    const calls = f.calls()
    await f.run(() => f.getCuratorBySlug('yonsei-university'))
    assert.equal(f.calls(), calls, 'successful result still uses cache')
  })
}

for (const view of ['hub', 'list', 'download'] as const) {
  for (const table of ['curators', 'curated_lists', 'curated_list_items']) {
    test(`${view} ${table} failure is not cached as an empty result`, async () => {
      const f = fixture()
      const read = () => view === 'hub' ? f.getCuratedHub() : view === 'list' ? f.getCuratedList('classics') : f.getCuratedListDownload('yonsei-university', 'classics', 'ko')
      f.fail(table)
      await assert.rejects(f.run(read), /upstream connection timeout/)
      assert.equal(f.entries.size, 0)
      f.fail()
      assert.ok(await f.run(read))
    })
  }
}

test('a genuinely missing curator remains null', async () => {
  const f = fixture()
  f.missing()
  assert.equal(await f.run(() => f.getCuratorBySlug('missing')), null)
})

test('downloads page through all public source entries beyond display and database caps, keeping unmatched works', async () => {
  const items = Array.from({ length: 1005 }, (_, index) => ({ id: String(index), raw_title: `작품 ${index + 1}`,
    raw_creator: null, content_id: null, contents: null, rank: null, year: null, note: '한국어 선정 사유', note_en: 'English selection note', hidden: false }))
  const f = fixture([...items, { ...items[0], id: 'hidden', raw_title: 'Hidden item', hidden: true }])
  const display = await f.run(() => f.getCuratedList('classics')) as { items: unknown[] }
  assert.equal(display.items.length, 500)
  const download = await f.run(() => f.getCuratedListDownload('yonsei-university', 'classics', 'ko'))
  assert.equal(download?.items.length, 1005)
  assert.equal(download.items[1004].rawTitle, '작품 1005')
  assert.equal(download.items[0].rawCreator, null)
  assert.equal(download.items[0].note, '한국어 선정 사유')
  assert.ok(download.items.every(item => item.rawTitle !== 'Hidden item'))
  const calls = f.calls()
  await f.run(() => f.getCuratedListDownload('yonsei-university', 'classics', 'ko'))
  assert.equal(f.calls(), calls, 'complete source lists share the existing curated cache')
  const english = await f.run(() => f.getCuratedListDownload('yonsei-university', 'classics', 'en'))
  assert.equal(english?.items[0].note, 'English selection note')
  assert.equal(await f.run(() => f.getCuratedListDownload('other-university', 'classics', 'ko')), null)
})
