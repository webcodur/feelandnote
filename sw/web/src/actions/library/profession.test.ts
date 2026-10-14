import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./profession.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function fixture(rowCount = 30, profileCount = 1) {
  const userCountRequests: string[][] = []
  const metadataRequests: string[][] = []
  const rankSelects: string[] = []
  const topCelebIdFilters: string[][] = []
  let rankReads = 0
  let topCelebQueries = 0
  let countReads = 0
  let fail = false
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    celeb_id: `figure-${i % profileCount}`, content_id: `work-${i.toString().padStart(2, '0')}`,
    contents: { id: `work-${i.toString().padStart(2, '0')}`, type: i % 2 ? 'VIDEO' : 'BOOK',
      content_locales: [{ locale: 'en', title: `Work ${i.toString().padStart(2, '0')}`, creator: 'Author', thumbnail_url: 'cover', affiliate_url: ['shop'] }] },
  }))
  const db = {
    from(table: string) {
      let select = '', ids: string[] = [], celebIds: string[] = [], from = 0, to = 999, head = false
      const builder = {
        select(value: string, options?: { head?: boolean }) { select = value; head = !!options?.head; return builder },
        in(key: string, values: string[]) {
          if (key === 'id') { ids = values; if (table === 'celebs') topCelebIdFilters.push(values) }
          if (key === 'celeb_id') celebIds = values
          return builder
        },
        eq() { return builder }, not() { return builder }, order() { return builder }, limit() { return builder },
        range(start: number, end: number) { from = start; to = end; return builder },
        then(resolve: (value: unknown) => void) {
          if (head) countReads++
          if (fail) return Promise.resolve(resolve({ data: null, error: { message: 'connection timeout' } }))
          let data: unknown[] = []
          if (table === 'celebs') {
            if (select === 'id') data = Array.from({ length: profileCount }, (_, i) => ({ id: `figure-${i}` })).slice(from, to + 1)
            else { topCelebQueries++; data = [{ id: 'figure-0', nickname: '인물', nickname_en: 'Figure', celeb_influence: { total_score: 20 } }] }
          }
          if (table === 'celeb_contents') { rankReads++; rankSelects.push(select); data = rows.filter(row => celebIds.includes(row.celeb_id)).slice(from, to + 1) }
          if (table === 'contents') { metadataRequests.push(ids); data = rows.filter(r => ids.includes(r.content_id)).map(r => r.contents) }
          return Promise.resolve(resolve({ data: head ? null : data, count: profileCount, error: null }))
        },
      }
      return builder
    },
    async rpc(_name: string, args: { p_content_ids: string[] }) {
      userCountRequests.push(args.p_content_ids)
      return { data: args.p_content_ids.map(content_id => ({ content_id, user_count: 7, celeb_count: 9 })), error: null }
    },
  }
  const mocks: Record<string, unknown> = {
    'next/cache': { unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => {
      const cache = new Map<string, unknown>()
      return async (...args: unknown[]) => { const key = JSON.stringify(args); if (!cache.has(key)) cache.set(key, await fn(...args)); return cache.get(key) }
    } },
    '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/cache': { STATIC_REVALIDATE: 604800,
      throwOnQueryError: (_label: string, error: { message: string } | null) => { if (error) throw new Error(error.message) },
    },
    '@/lib/celeb-professions': { getCelebProfessions: async () => [{ value: 'entrepreneur', label: '기업가' }] },
    'next-intl/server': { getLocale: async () => 'en' },
    '@/lib/utils/content-locale': require('../../lib/utils/content-locale'),
  }
  const loaded = { exports: {} as {
    getLibraryByProfession: (params: { category?: string; page?: number; limit?: number }) => Promise<{ contents: Array<{ id: string; user_count: number; celeb_count: number; title: string; affiliate_url: unknown }>; total: number; totalPages: number; currentPage: number }>
    getProfessionContentCounts: () => Promise<Array<{ profession: string; count: number }>>
  } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  return { ...loaded.exports, userCountRequests, metadataRequests, rankSelects, topCelebIdFilters, rankReads: () => rankReads, topCelebQueries: () => topCelebQueries, countReads: () => countReads, fail: (value: boolean) => { fail = value } }
}

test('profession switching counts and hydrates only the visible page', async () => {
  const f = fixture()
  const result = await f.getLibraryByProfession({ limit: 12 })
  assert.ok(f.userCountRequests.every(ids => ids.length <= 12), 'off-screen user counts delay the first 12 cards')
  assert.deepEqual(f.metadataRequests, [result.contents.map(c => c.id)])
  assert.equal(result.total, 30)
  assert.ok(result.contents.every(c => c.user_count === 7 && c.celeb_count === 9))
  assert.ok(f.rankSelects.every(select => !/thumbnail|creator|sources|affiliate/.test(select)))
  assert.deepEqual(f.topCelebIdFilters, [], 'large profession ID lists cause HTTP 414')
})

test('category and pagination reuse ranks while preserving ordering and edition data', async () => {
  const f = fixture()
  const first = await f.getLibraryByProfession({ category: 'BOOK', limit: 12 })
  const reads = f.rankReads()
  const second = await f.getLibraryByProfession({ category: 'BOOK', page: 2, limit: 12 })
  assert.equal(f.rankReads(), reads)
  assert.equal(first.total, 15)
  assert.deepEqual(second.contents.map(c => c.id), ['work-24', 'work-26', 'work-28'])
  assert.equal(second.contents[0].title, 'Work 24')
  assert.deepEqual(second.contents[0].affiliate_url, ['shop'])
})

test('query failure is surfaced for retry and does not poison the ranking cache', async () => {
  const f = fixture()
  f.fail(true)
  await assert.rejects(f.getLibraryByProfession({}), /connection timeout/)
  f.fail(false)
  assert.equal((await f.getLibraryByProfession({})).contents.length, 12)
})

test('ranking reads past the database row limit without loading off-screen metadata', async () => {
  const f = fixture(1030)
  const result = await f.getLibraryByProfession({ limit: 12 })
  assert.equal(result.total, 1030)
  assert.equal(f.rankReads(), 2)
  assert.equal(f.metadataRequests[0].length, 12)
  assert.equal(f.userCountRequests[0].length, 12)
})

test('profession profiles beyond 1000 rows are included in the ranking', async () => {
  const f = fixture(1030, 1030)
  assert.equal((await f.getLibraryByProfession({ limit: 12 })).total, 1030)
})

test('classics do not wait for unused top figure data', async () => {
  const f = fixture()
  await f.getLibraryByProfession({})
  assert.equal(f.topCelebQueries(), 0)
})

test('profession count errors are not cached as absent filters', async () => {
  const f = fixture()
  f.fail(true)
  await assert.rejects(f.getProfessionContentCounts(), /connection timeout/)
  f.fail(false)
  assert.equal((await f.getProfessionContentCounts())[0].count, 1)
})

test('concurrent initial requests share the profession count query', async () => {
  const f = fixture()
  await Promise.all([f.getProfessionContentCounts(), f.getProfessionContentCounts()])
  assert.equal(f.countReads(), 1)
})
