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

function fixture() {
  const calls: { name: string; args: Record<string, unknown>; options?: { count?: string }; filter?: unknown[]; range?: number[] }[] = []
  const population = Array.from({ length: 123 }, (_, i) => ({ id: String(i), nickname: String(i), content_count: i % 3 === 0 ? 0 : 4 }))
  const db = {
    rpc(name: string, args: Record<string, unknown>, options?: { count?: string }) {
      const call = { name, args, options, filter: undefined as unknown[] | undefined, range: undefined as number[] | undefined }
      calls.push(call)
      const filtered = population.filter(row => row.content_count >= Number(args.p_min_content_count ?? 0))
      if (name === 'count_celebs_filtered') return Promise.resolve({ data: filtered.length, error: null })
      let rows = args.p_limit === null ? filtered : filtered.slice(Number(args.p_offset), Number(args.p_offset) + Number(args.p_limit))
      let total = rows.length
      const builder = {
        eq(column: string, value: unknown) {
          call.filter = [column, value]
          rows = rows.filter(row => row.content_count === value)
          total = rows.length
          return builder
        },
        range(from: number, to: number) { call.range = [from, to]; rows = rows.slice(from, to + 1); return builder },
        then(resolve: (value: unknown) => void) { resolve({ data: rows, count: total, error: null }) },
      }
      return builder
    },
    from() {
      const builder: Record<string, unknown> = { then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }) }
      for (const method of ['select', 'gt', 'order', 'range', 'in', 'eq', 'overrideTypes']) builder[method] = () => builder
      return builder
    },
  }
  const mocks: Record<string, unknown> = {
    'next/cache': { unstable_cache: (fn: unknown) => fn },
    '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/db/server': { createClient: () => { throw new Error('No viewer reads'); } },
  }
  const loaded = { exports: {} as { getCelebs: (params: Record<string, unknown>) => Promise<{ celebs: { id: string; content_count: number }[]; total: number; totalPages: number }> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  return { calls, getCelebs: loaded.exports.getCelebs }
}

test('without works filters the complete RPC result before range and uses the matching exact count', async () => {
  const f = fixture()
  const first = await f.getCelebs({ contentPresence: 'without', page: 1, limit: 24, includeViewerState: false })
  const second = await f.getCelebs({ contentPresence: 'without', page: 2, limit: 24, includeViewerState: false })
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

test('with works passes the same positive minimum to count and row RPCs', async () => {
  const f = fixture()
  const result = await f.getCelebs({ contentPresence: 'with', page: 2, limit: 24, contentType: 'BOOK', includeViewerState: false })
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

test('explore defaults to most works and retains explicit random URLs', () => {
  assert.equal(DEFAULT_EXPLORE_SORT, 'content_count')
  assert.equal(parseFilterParams({}).sortBy, DEFAULT_EXPLORE_SORT)
  assert.equal(parseFilterParams({ sortBy: 'bad' }).sortBy, DEFAULT_EXPLORE_SORT)
  assert.equal(parseFilterParams({ sortBy: ['daily_recommend'] }).sortBy, DEFAULT_EXPLORE_SORT)
  assert.equal(parseFilterParams({ sortBy: 'daily_recommend', page: '2' }).sortBy, 'daily_recommend')
  assert.equal(CELEB_SORT_OPTIONS.at(-1), 'daily_recommend')
  for (const sortBy of CELEB_SORT_OPTIONS) assert.equal(parseFilterParams({ sortBy }).sortBy, sortBy)
})

test('explore starts with entrepreneurs but explicit all and other professions survive URL reloads', () => {
  assert.equal(parseFilterParams({}).profession, 'entrepreneur')
  assert.equal(parseFilterParams({ page: '2' }).profession, 'entrepreneur')
  assert.equal(parseFilterParams({ profession: '' }).profession, 'entrepreneur')
  assert.equal(parseFilterParams({ profession: 'all' }).profession, undefined)
  assert.equal(parseFilterParams({ profession: 'all', page: '2' }).profession, undefined)
  assert.equal(parseFilterParams({ profession: 'author', page: '2' }).profession, 'author')
})
