import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'
import { coalescePublicRead } from '../../lib/coalescePublicRead'
import { selectTodayFigure, TODAY_FIGURE_FALLBACK_COUNTRY, TODAY_FIGURE_MIN_INFLUENCE_SCORE } from '../../lib/celeb/todayFigureSelection'
import type { GetUserContentsResponse } from '../contents/getUserContents'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./today-figure.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const initialCompiled = ts.transpileModule(readFileSync(new URL('../contents/getInitialCelebContents.ts', import.meta.url), 'utf8'), {
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
  let failContents = false
  let counts = { BOOK: 6, VIDEO: 2, GAME: 0, MUSIC: 0 }
  const contentRequests: { userId: string; type: string; page: number; limit: number; sortBy: string; locale: string }[] = []
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
      if (this.table === 'get_celeb_type_counts') {
        return Object.entries(counts).map(([content_type, total]) => ({ content_type, total }))
      }
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
    '@/lib/utils/celeb-dialogues': { DIALOGUE_BRIEF_SELECT: '' },
    '@/actions/contents/getContentBrief': {
      getInitialContentBrief: async (contentId: string) => ({ contentId }),
      getContentBrief: async (contentId: string) => ({ contentId }),
    },
    '@/lib/render-mode': { shouldStreamForRequest: async () => true },
  }
  const initial = { exports: {} as { getInitialCelebContents: (id: string, counts: object, locale: string) => Promise<GetUserContentsResponse> } }
  const initialMocks: Record<string, unknown> = {
    '@/constants/categories': { CATEGORIES: ['BOOK', 'VIDEO', 'GAME', 'MUSIC'].map(dbType => ({ dbType })) },
    './getUserContents': { getPublicUserContents: async (params: typeof contentRequests[number], locale: string) => {
      reads.contents++
      contentRequests.push({ ...params, locale })
      if (failContents) throw new Error('contents unavailable')
      const total = counts[params.type as keyof typeof counts]
      return { items: Array.from({ length: Math.min(total, params.limit) }, (_, index) => ({
        id: `record-${index}`, content_id: `book-${index}`, content: { type: params.type },
      })), total, page: params.page, totalPages: Math.ceil(total / params.limit), hasMore: total > params.limit }
    } },
  }
  new Function('require', 'module', 'exports', initialCompiled)((id: string) => initialMocks[id] ?? require(id), initial, initial.exports)
  mocks['@/actions/contents/getInitialCelebContents'] = initial.exports
  const loaded = { exports: {} as { getTodayFigure: () => Promise<{
    figure: { id: string; contentCount: number }; date: string; initialContents: GetUserContentsResponse; initialContentBrief: { contentId: string };
  }> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  return {
    reads, fail: (value: boolean) => { failEligibility = value },
    failInfluence: (value: boolean) => { failInfluence = value },
    failContents: (value: boolean) => { failContents = value },
    setCounts: (value: typeof counts) => { counts = value },
    contentRequests,
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

test('홈은 상세의 첫 분류·최근순 첫 페이지를 조회하고 4건 이후도 탐색할 수 있는 응답을 전달한다', async () => {
  const f = fixture()
  const result = await f.read('KR', 'en')
  assert.deepEqual(f.contentRequests, [{ userId: result.figure.id, type: 'BOOK', page: 1, limit: 4, sortBy: 'recent', locale: 'en' }])
  assert.equal(result.initialContents.items.length, 4)
  assert.equal(result.initialContents.total, 6)
  assert.equal(result.initialContents.hasMore, true)
  assert.equal(result.figure.contentCount, 8)
  assert.equal(result.initialContentBrief.contentId, result.initialContents.items[0].content_id)
})

test('도서가 없는 인물은 상세와 같이 첫 감상 유형을 영상으로 연다', async () => {
  const f = fixture()
  f.setCounts({ BOOK: 0, VIDEO: 6, GAME: 0, MUSIC: 1 })
  const result = await f.read('US')
  assert.equal(f.contentRequests[0].type, 'VIDEO')
  assert.equal(result.initialContents.items[0].content.type, 'VIDEO')
})

test('감상 첫 조회가 실패하면 빈 책장을 캐시하지 않고 다음 요청에서 회복한다', async () => {
  const f = fixture()
  f.failContents(true)
  await assert.rejects(f.read('US'), /contents unavailable/)
  f.failContents(false)
  assert.equal((await f.read('US')).initialContents.items.length, 4)
  assert.equal(f.reads.contents, 2)
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
