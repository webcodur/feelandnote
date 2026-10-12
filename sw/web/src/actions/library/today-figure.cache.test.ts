import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'
import { coalescePublicRead } from '../../lib/coalescePublicRead'
import { selectTodayFigure, TODAY_FIGURE_FALLBACK_COUNTRY, TODAY_FIGURE_MIN_INFLUENCE_SCORE } from '../../lib/celeb/todayFigureSelection'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./today-figure.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function fixture() {
  const request = new AsyncLocalStorage<{ country: string | null; locale: string }>()
  const reads = { directory: 0, eligibility: 0, exclusions: 0, influence: 0, profile: 0, contents: 0 }
  const people = Array.from({ length: 30 }, (_, index) => ({
    id: `US-${index}`, nationality: 'US',
  }))
  // These rows must not enter the selection pool.
  const directory = [...people, { id: 'excluded', nationality: 'JP' }, { id: 'ineligible', nationality: 'KR' },
    { id: 'low-influence', nationality: 'KR' }, { id: 'unrated', nationality: 'KR' }]
  let failEligibility = false
  let failInfluence = false
  class Query {
    id: string | null = null
    minScore = 0
    constructor(readonly table: string) {}
    select() { return this }
    eq(column: string, value: string) { if (column === 'id') this.id = value; return this }
    in() { return this }
    gte(column: string, value: number) {
      assert.equal(column, 'total_score')
      this.minScore = value
      return this
    }
    order() { return this }
    range() { return this }
    single() { return this }
    overrideTypes() { return this }
    async read() {
      await Promise.resolve()
      if (this.table === 'get_seed_eligible_celebs') {
        reads.eligibility++
        if (failEligibility) throw new Error('eligibility unavailable')
        return directory.filter(row => row.id !== 'ineligible').map(row => ({ celeb_id: row.id, content_count: 5 }))
      }
      if (this.table === 'celeb_influence') {
        reads.influence++
        if (failInfluence) throw new Error('influence unavailable')
        assert.equal(this.minScore, TODAY_FIGURE_MIN_INFLUENCE_SCORE)
        return directory.filter(row => row.id !== 'unrated')
          .map(row => ({ celeb_id: row.id, total_score: row.id === 'low-influence' ? 39 : 40 }))
          .filter(row => row.total_score >= this.minScore)
      }
      if (this.table === 'celebs' && !this.id) { reads.directory++; return directory }
      if (this.table === 'celebs') { reads.profile++; return { id: this.id, nickname: this.id, nickname_en: this.id } }
      if (this.table === 'celeb_contents') {
        reads.contents++
        return Array.from({ length: 5 }, (_, index) => ({ id: `record-${index}`, content_id: `book-${index}`, contents: { id: `book-${index}`, type: 'BOOK' } }))
      }
      return null
    }
    then(resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) {
      return this.read().then(data => ({ data, error: null })).then(resolve, reject)
    }
  }
  const db = { from: (name: string) => new Query(name), rpc: (name: string) => new Query(name) }
  const mocks: Record<string, unknown> = {
    'next/cache': { unstable_cache: (read: (...args: unknown[]) => Promise<unknown>) => {
      const completed = new Map<string, unknown>()
      return async (...args: unknown[]) => {
        const key = JSON.stringify(args)
        if (completed.has(key)) return completed.get(key)
        const value = await read(...args)
        completed.set(key, value)
        return value
      }
    } },
    '@feelandnote/shared/constants/cache-tags': { CACHE_TAGS: {} },
    '@feelandnote/shared/constants/celeb-tiers': { LISTING_DEFAULT_REALITIES: ['REAL', 'BOTH'] },
    '@feelandnote/shared/lib/paginate': { selectAllPages: async (build: (from: number, to: number) => Query) => build(0, 999).read() },
    '@/lib/cache': { STATIC_REVALIDATE: 604800, throwOnQueryError: () => {}, withQueryFallback: (_label: string, read: () => Promise<unknown>) => read() },
    '@/lib/db/static': { createStaticClient: () => db },
    'next-intl/server': { getLocale: async () => request.getStore()!.locale },
    '@/lib/game/date-seed': { getKSTDateKey: () => '2026-10-07' },
    '@/lib/visitorCountryServer': { getVisitorCountry: async () => request.getStore()!.country },
    '@/lib/coalescePublicRead': { coalescePublicRead },
    '@/lib/celeb/todayFigureSelection': { selectTodayFigure, TODAY_FIGURE_FALLBACK_COUNTRY, TODAY_FIGURE_MIN_INFLUENCE_SCORE },
    '@/lib/celeb-feature-exclusion': { fetchFeatureExcludedCelebIds: async () => { reads.exclusions++; return new Set(['excluded']) } },
    '@/lib/utils/content-locale': { CL_SELECT_LIST_WITH_AFFILIATE: '', flattenLocales: () => ({ title: 'Book' }) },
    '@/lib/utils/celeb-dialogues': { DIALOGUE_BRIEF_SELECT: '' },
    './helpers': { fetchUserContentCounts: async () => new Map() },
  }
  const loaded = { exports: {} as { getTodayFigure: () => Promise<{ figure: { id: string }; date: string }> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  return {
    reads, fail: (value: boolean) => { failEligibility = value },
    failInfluence: (value: boolean) => { failInfluence = value },
    read: (country: string | null, locale = 'ko') => request.run({ country, locale }, loaded.exports.getTodayFigure),
  }
}

test('cold requests across countries and languages share candidate reads and US profile payloads', async () => {
  const f = fixture()
  const results = await Promise.all([f.read('JP'), f.read('KR'), f.read('US'), f.read(null), f.read('JP', 'en'), f.read('KR', 'en')])
  assert.equal(new Set(results.map(row => row.figure.id)).size, 1)
  assert.ok(results[0].figure.id.startsWith('US-'))
  assert.ok(results.every(row => row.date === '2026-10-07'))
  assert.deepEqual(f.reads, { directory: 1, eligibility: 1, exclusions: 1, influence: 1, profile: 2, contents: 2 })
  await f.read('FR')
  assert.deepEqual(f.reads, { directory: 1, eligibility: 1, exclusions: 1, influence: 1, profile: 2, contents: 2 })
})

test('low and missing influence scores are excluded; the C-rank boundary remains eligible', async () => {
  const f = fixture()
  assert.equal(TODAY_FIGURE_MIN_INFLUENCE_SCORE, 40)
  const result = await f.read('KR')
  assert.ok(result.figure.id.startsWith('US-'))
  assert.equal(f.reads.influence, 1)
})

test('failed influence queries can recover without caching an empty directory', async () => {
  const f = fixture()
  f.failInfluence(true)
  await assert.rejects(f.read('KR'), /influence unavailable/)
  f.failInfluence(false)
  assert.ok((await f.read('KR')).figure.id.startsWith('US-'))
  assert.equal(f.reads.influence, 2)
})

test('failed candidate queries are not cached as empty and can recover on the next request', async () => {
  const f = fixture()
  f.fail(true)
  const failed = await Promise.allSettled([f.read('JP'), f.read('KR')])
  assert.ok(failed.every(result => result.status === 'rejected'))
  assert.equal(f.reads.eligibility, 1)
  f.fail(false)
  assert.ok((await f.read('JP')).figure.id.startsWith('US-'))
  assert.equal(f.reads.eligibility, 2)
})
