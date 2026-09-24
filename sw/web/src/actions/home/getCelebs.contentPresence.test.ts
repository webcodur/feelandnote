import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import { parseCelebContentPresence } from '@/constants/celebContentPresence'
import { parseFilterParams } from '@/app/[locale]/(main)/explore/figures/filterParams'
import { CELEB_SORT_OPTIONS, DEFAULT_EXPLORE_SORT } from '@/constants/celebSort'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./getCelebs.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function fixture(trendIds: string[] = [], available = true) {
  const calls: { name: string; args: Record<string, unknown>; options?: { count?: string }; filter?: unknown[]; range?: number[] }[] = []
  const directCalls: string[] = []
  const population = Array.from({ length: 123 }, (_, i) => ({ id: String(i), nickname: String(i), content_count: i % 3 === 0 ? 0 : 4 }))
  const db = {
    rpc(name: string, args: Record<string, unknown>, options?: { count?: string }) {
      const call = { name, args, options, filter: undefined as unknown[] | undefined, range: undefined as number[] | undefined }
      calls.push(call)
      let selected = false
      const filtered = population.filter(row => row.content_count >= Number(args.p_min_content_count ?? 0))
      if (name === 'count_celebs_filtered') return Promise.resolve({ data: filtered.length, error: null })
      let rows = args.p_limit === null ? filtered : filtered.slice(Number(args.p_offset), Number(args.p_offset) + Number(args.p_limit))
      let total = rows.length
      const builder = {
        in(column: string, ids: string[]) { call.filter = [column, ids]; rows = rows.filter(row => ids.includes(row.id)); total = rows.length; return builder },
        not(_column: string, _operator: string, value: string) {
          const ids = value.slice(1, -1).split(',')
          rows = rows.filter(row => !ids.includes(row.id)); total = rows.length; return builder
        },
        order(column: string, options: { ascending: boolean }) {
          if (column === 'content_count') rows.sort((a, b) => options.ascending ? a.content_count - b.content_count : b.content_count - a.content_count)
          if (column === 'id' && selected) rows.sort((a, b) => options.ascending ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id))
          return builder
        },
        select() { selected = true; return builder },
        eq(column: string, value: unknown) {
          call.filter = [column, value]
          rows = rows.filter(row => row.content_count === value)
          total = rows.length
          return builder
        },
        range(from: number, to: number) { call.range = [from, to]; return builder },
        then(resolve: (value: unknown) => void) {
          const [from, to] = call.range ?? [0, rows.length - 1]
          if (options?.count === 'exact' && from > 0 && from >= total) {
            resolve({ data: null, count: null, error: { code: 'PGRST103', message: 'Requested range not satisfiable' } })
          } else resolve({ data: rows.slice(from, to + 1), count: total, error: null })
        },
      }
      return builder
    },
    from(table: string) {
      let ids: string[] = []
      let direct = false
      const builder = {
        select(columns: string) {
          direct = table === 'celeb_metrics' || (table === 'celebs' && columns.startsWith('id,slug,nickname,nickname_en,avatar_url'))
          if (direct) directCalls.push(table)
          return builder
        },
        in(_column: string, values: string[]) { ids = values; return builder },
        gt() { return builder }, order() { return builder }, range() { return builder },
        eq() { return builder }, overrideTypes() { return builder },
        then(resolve: (value: unknown) => void) {
          resolve({ data: direct ? ids.map(id => table === 'celebs'
            ? { id, nickname: id, celeb_tier: 'full', celeb_reality: 'REAL' }
            : { celeb_id: id, follower_count: 0, content_count: 4 }) : [], error: null })
        },
      }
      return builder
    },
  }
  const mocks: Record<string, unknown> = {
    'next/cache': { unstable_cache: (fn: unknown) => fn },
    '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/db/server': { createClient: () => { throw new Error('No viewer reads'); } },
    '@/lib/trends/countryTrending': { getCountryTrendingPeople: async () => ({ matches: trendIds.map(id => ({ id, trendTitle: 'x', rank: 1, volume: 1000, started: 1700000000000 })), available }) },
  }
  const loaded = { exports: {} as { getCelebs: (params: Record<string, unknown>) => Promise<{ celebs: { id: string; content_count: number; trend_match?: { title: string; rank: number; country: string; volume: number; started: number } | null }[]; total: number; totalPages: number; trend?: { country: string; available: boolean; matchedCount: number } }> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  return { calls, directCalls, getCelebs: loaded.exports.getCelebs }
}

test('without works filters the complete RPC result before range and uses the matching exact count', async () => {
  const f = fixture()
  const first = await f.getCelebs({ sortBy: 'name_asc', contentPresence: 'without', page: 1, limit: 24, includeViewerState: false })
  const second = await f.getCelebs({ sortBy: 'name_asc', contentPresence: 'without', page: 2, limit: 24, includeViewerState: false })
  assert.equal(first.total, 41)
  assert.equal(first.totalPages, 2)
  assert.equal(first.celebs.length, 24)
  assert.equal(second.celebs.length, 17)
  assert.equal(new Set([...first.celebs, ...second.celebs].map(row => row.id)).size, 41)
  assert.ok([...first.celebs, ...second.celebs].every(row => row.content_count === 0))
  for (const [index, call] of f.calls.entries()) {
    assert.equal(call.name, 'get_celebs_sorted')
    assert.equal(call.args.p_limit, null)
    assert.equal(call.args.p_offset, 0)
    assert.deepEqual(call.filter, ['content_count', 0])
    assert.deepEqual(call.range, [index * 24, index * 24 + 23])
    assert.equal(call.options?.count, 'exact')
  }
})

test('country trends promote filtered matches across pages without omissions or duplicates', async () => {
  const f = fixture(['120', '121', '119', '118', '117'])
  const params = { sortBy: 'country_trending', trendCountry: 'US', contentPresence: 'with', limit: 2, includeViewerState: false,
    profession: 'entrepreneur', nationality: 'US', contentType: 'BOOK', gender: 'male', search: 'name', factionId: 'tag',
    tiers: ['full'], realities: ['REAL'], birthYearMin: 1900, birthYearMax: 2000 }
  const pages = []
  for (let page = 1; page <= 41; page++) pages.push(await f.getCelebs({ ...params, page }))
  assert.deepEqual(pages[0].celebs.map(row => row.id), ['121', '119'])
  assert.equal(pages[1].celebs[0].id, '118')
  const all = pages.flatMap(page => page.celebs)
  assert.equal(all.length, 82)
  assert.equal(new Set(all.map(row => row.id)).size, 82)
  assert.ok(all.every(row => row.content_count > 0))
  assert.ok(pages.every(page => page.total === 82 && page.totalPages === 41))
  assert.deepEqual(pages[0].trend, { country: 'US', available: true, matchedCount: 3 })
  assert.deepEqual(pages[0].celebs[0].trend_match, { title: 'x', rank: 1, country: 'US', volume: 1000, started: 1700000000000 })
  assert.equal(pages[1].celebs[1].trend_match, null)
  for (const call of f.calls) {
    assert.equal(call.name, 'get_celebs_sorted')
    assert.equal(call.args.p_limit, null)
    assert.equal(call.args.p_offset, 0)
    assert.equal(call.args.p_sort_by, 'content_count')
    assert.equal(call.args.p_profession, 'entrepreneur')
    assert.equal(call.args.p_nationality, 'US')
    assert.equal(call.args.p_content_type, 'BOOK')
    assert.equal(call.args.p_gender, 'male')
    assert.equal(call.args.p_search, 'name')
    assert.equal(call.args.p_faction_id, 'tag')
    assert.deepEqual(call.args.p_celeb_tiers, ['full'])
    assert.deepEqual(call.args.p_celeb_realities, ['REAL'])
    assert.equal(call.args.p_birth_year_min, 1900)
    assert.equal(call.args.p_birth_year_max, 2000)
  }
})

test('country trends respect without-works filtering before promotion and paginate beyond the last page', async () => {
  const f = fixture(['121', '120'])
  const params = { sortBy: 'country_trending', contentPresence: 'without', limit: 24, includeViewerState: false }
  const first = await f.getCelebs(params)
  const second = await f.getCelebs({ ...params, page: 2 })
  const beyond = await f.getCelebs({ ...params, page: 3 })
  assert.equal(first.celebs[0].id, '120')
  assert.equal(first.trend?.matchedCount, 1)
  assert.equal(first.total, 41)
  assert.equal(second.celebs.length, 17)
  assert.equal(new Set([...first.celebs, ...second.celebs].map(row => row.id)).size, 41)
  assert.ok([...first.celebs, ...second.celebs].every(row => row.content_count === 0))
  assert.equal(beyond.celebs.length, 0)
  assert.equal(beyond.total, 41)
  assert.equal(beyond.trend?.matchedCount, 1)
})

test('missing or unavailable country trends fall back to works order with honest status', async () => {
  for (const available of [true, false]) {
    const f = fixture([], available)
    const result = await f.getCelebs({ sortBy: 'country_trending', trendCountry: 'invalid', limit: 123, includeViewerState: false })
    assert.equal(result.total, 123)
    assert.equal(new Set(result.celebs.map(row => row.id)).size, 123)
    assert.ok(result.celebs.every((row, i, rows) => i === 0 || rows[i - 1].content_count >= row.content_count))
    assert.deepEqual(result.trend, { country: 'KR', available, matchedCount: 0 })
  }
})

test('with works passes the same positive minimum to count and row RPCs', async () => {
  const f = fixture()
  const result = await f.getCelebs({ sortBy: 'name_asc', contentPresence: 'with', page: 2, limit: 24, contentType: 'BOOK', includeViewerState: false })
  assert.ok(result.celebs.every(row => row.content_count > 0))
  assert.equal(result.total, 82)
  assert.equal(f.calls.length, 2)
  for (const call of f.calls) {
    assert.equal(call.args.p_min_content_count, 1)
    assert.equal(call.args.p_content_type, 'BOOK')
  }
  assert.equal(f.calls[1].args.p_limit, 24)
  assert.equal(f.calls[1].args.p_offset, 24)
})

test('URL parsing retains valid work filters for SSR and rejects unknown values', () => {
  assert.equal(parseFilterParams({}).contentPresence, 'with')
  assert.equal(parseFilterParams({ contentPresence: 'all' }).contentPresence, 'all')
  assert.equal(parseFilterParams({ contentPresence: 'without', page: '2' }).contentPresence, 'without')
  assert.equal(parseFilterParams({ contentPresence: 'with' }).contentPresence, 'with')
  assert.equal(parseFilterParams({ contentPresence: ['without'] }).contentPresence, 'with')
  assert.equal(parseFilterParams({ contentPresence: 'bad' }).contentPresence, 'with')
  assert.equal(parseCelebContentPresence('bad'), 'all')
})

test('explore defaults to today recommendations with records and retains explicit trend URLs', () => {
  assert.equal(DEFAULT_EXPLORE_SORT, 'daily_recommend')
  assert.equal(parseFilterParams({}).sortBy, DEFAULT_EXPLORE_SORT)
  assert.equal(parseFilterParams({}).contentPresence, 'with')
  assert.equal(parseFilterParams({ sortBy: 'country_trending' }).contentPresence, 'with')
  assert.equal(parseFilterParams({ sortBy: 'content_count' }).contentPresence, 'with')
  assert.equal(parseFilterParams({ sortBy: 'daily_recommend' }).contentPresence, 'with')
  assert.equal(parseFilterParams({ sortBy: 'daily_recommend', contentPresence: 'all' }).contentPresence, 'all')
  assert.equal(parseFilterParams({ sortBy: 'daily_recommend', contentPresence: 'without' }).contentPresence, 'without')
  assert.equal(parseFilterParams({ sortBy: 'bad' }).sortBy, DEFAULT_EXPLORE_SORT)
  assert.equal(parseFilterParams({ sortBy: ['daily_recommend'] }).sortBy, DEFAULT_EXPLORE_SORT)
  assert.equal(parseFilterParams({ sortBy: 'daily_recommend', page: '2' }).sortBy, 'daily_recommend')
  assert.equal(parseFilterParams({ sortBy: 'content_count', page: '2' }).sortBy, 'content_count')
  assert.equal(CELEB_SORT_OPTIONS[0], DEFAULT_EXPLORE_SORT)
  assert.equal(CELEB_SORT_OPTIONS[1], 'country_trending')
  for (const sortBy of CELEB_SORT_OPTIONS) assert.equal(parseFilterParams({ sortBy }).sortBy, sortBy)
})

test('trend country is independent of nationality and survives filter URLs', () => {
  const filters = parseFilterParams({ sortBy: 'country_trending', trendCountry: 'us', nationality: 'KR', profession: 'all', page: '2' })
  assert.equal(filters.sortBy, 'country_trending')
  assert.equal(filters.trendCountry, 'US')
  assert.equal(filters.nationality, 'KR')
  assert.equal(filters.profession, undefined)
  assert.equal(filters.page, 2)
  assert.equal(parseFilterParams({ trendCountry: 'ZZ' }).trendCountry, undefined)
  assert.equal(parseFilterParams({ trendCountry: ['US'] }).trendCountry, undefined)
})

test('explore starts with every profession and retains explicit profession URLs', () => {
  assert.equal(parseFilterParams({}).profession, undefined)
  assert.equal(parseFilterParams({ page: '2' }).profession, undefined)
  assert.equal(parseFilterParams({ profession: '' }).profession, undefined)
  assert.equal(parseFilterParams({ profession: 'all' }).profession, undefined)
  assert.equal(parseFilterParams({ profession: 'all', page: '2' }).profession, undefined)
  assert.equal(parseFilterParams({ profession: 'author', page: '2' }).profession, 'author')
})

test('today recommendations use the existing sorted listing and preserve pagination', async () => {
  const f = fixture()
  const params = { sortBy: 'daily_recommend', contentPresence: parseFilterParams({ sortBy: 'daily_recommend' }).contentPresence, limit: 24, includeViewerState: false }
  const first = await f.getCelebs({ ...params, page: 1 })
  const second = await f.getCelebs({ ...params, page: 2 })
  assert.equal(first.total, 82)
  assert.equal(second.total, 82)
  assert.equal(first.totalPages, 4)
  assert.equal(new Set([...first.celebs, ...second.celebs].map(row => row.id)).size, 48)
  const sortedCalls = f.calls.filter(call => call.name === 'get_celebs_sorted')
  assert.equal(sortedCalls.length, 2)
  assert.ok(sortedCalls.every(call => call.args.p_sort_by === 'daily_recommend'))
  assert.equal(f.directCalls.length, 0)
})
