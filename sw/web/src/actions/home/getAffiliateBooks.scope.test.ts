import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('./getAffiliateBooks.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function load() {
  const queries: { table: string; ids?: string[] }[] = []
  const tables: Record<string, Record<string, unknown>[]> = {
    celebs: ['peer', 'self'].map(id => ({ id, profession: 'inventor', publication_status: 'active', birth_date: '1960-01-01' })),
    celeb_contents: [
      { id: '1', celeb_id: 'peer', content_id: 'book-a', visibility: 'public' },
      { id: '2', celeb_id: 'peer', content_id: 'book-b', visibility: 'public' },
      { id: '3', celeb_id: 'self', content_id: 'self-only', visibility: 'public' },
      { id: '4', celeb_id: 'peer', content_id: 'private-only', visibility: 'private' },
    ],
    figure_book_contents: [],
    content_locales: ['book-a', 'book-b', 'self-only', 'private-only', 'unrelated'].map(content_id => ({
      content_id, locale: 'ko', title: content_id, creator: 'writer', isbn: '9788937460012',
      sources: {}, affiliate_url: null, contents: { type: 'BOOK', user_count: 1 },
    })),
  }
  let failed = false
  const db = { from(table: string) {
    const entry: { table: string; ids?: string[] } = { table }
    queries.push(entry)
    let rows = tables[table] ?? []
    const builder = {
      select() { return builder }, order() { return builder }, limit() { return builder }, overrideTypes() { return builder },
      eq(key: string, value: unknown) {
        rows = rows.filter(row => key === 'contents.type' ? (row.contents as { type: string })?.type === value : row[key] === value)
        return builder
      },
      gte() { return builder },
      in(key: string, ids: string[]) { entry.ids = ids; rows = rows.filter(row => ids.includes(row[key] as string)); return builder },
      range(from: number, to: number) { rows = rows.slice(from, to + 1); return builder },
      then(resolve: (result: unknown) => void) { return Promise.resolve({ data: rows, error: failed ? { message: 'DB unavailable' } : null }).then(resolve) },
    }
    return builder
  } }
  const mocks: Record<string, unknown> = {
    react: { cache: (fn: unknown) => fn },
    '@/lib/compressedJsonCache': { compressedJsonCache: (fn: unknown) => fn },
    '@/lib/db/static': { createStaticClient: () => db },
    '@/lib/cache': { cachedDetail: (_domain: unknown, _id: unknown, _key: unknown, fn: () => unknown) => fn(),
      cachedList: (_domain: unknown, _key: unknown, fn: () => unknown) => fn(), STATIC_REVALIDATE: 60,
      throwOnQueryError: (_label: unknown, error: { message: string } | null) => { if (error) throw Error(error.message) } },
    '@/actions/figure-books/figureBookEditions': { loadFigureBookEditions: async (_db: unknown, ids: string[]) => {
      assert.deepEqual(ids, [], 'unrelated figure editions must not be fetched')
      return new Map()
    } },
  }
  const loaded = { exports: {} as { getProfessionPeerBooks: (...args: unknown[]) => Promise<{ contentId: string; readerIds: string[] }[]> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  return { get: loaded.exports.getProfessionPeerBooks, queries, fail: (value: boolean) => { failed = value } }
}

test('profession recommendations fetch only actual public peer books and retain reader evidence', async () => {
  const { get, queries } = load()
  const result = await get('inventor', 'ko', ['self'], new Set(['book-a']), 24)
  assert.deepEqual(result.map(book => book.contentId), ['book-b'])
  assert.deepEqual(result[0].readerIds, ['peer'])
  for (const query of queries.filter(query => ['content_locales', 'figure_book_contents'].includes(query.table))) {
    assert.deepEqual(query.ids, ['book-a', 'book-b'], 'book queries must stay within the public peer candidates')
  }
})

test('failed scoped recommendation reads reject and a subsequent request can recover', async () => {
  const state = load()
  state.fail(true)
  await assert.rejects(state.get('inventor', 'ko', ['self'], new Set(), 24), /DB unavailable/)
  state.fail(false)
  assert.equal((await state.get('inventor', 'ko', ['self'], new Set(), 24)).length, 2)
})
