import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

test('a selected myth keeps the shared menu but reads only its own members, guides and books', async () => {
  const compiled = ts.transpileModule(readFileSync(new URL('./getMythData.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  let inCache = false
  const ids: unknown[] = []
  const myth = { id: 'selected', slug: 'selected', lv1_id: 'r', name: 'Selected', published: true }
  const index = { regions: [{ id: 'r', slug: 'r', name: 'Region', mythIds: ['selected', 'other'] }],
    myths: [myth, { ...myth, id: 'other', slug: 'other', isPublished: true }].map(row => ({ ...row, isPublished: true })), people: [], works: [] }
  const db = { from(table: string) {
    const filters: Record<string, unknown> = {}
    const query = { select: () => query, order: () => query, eq: (key: string, value: unknown) => { filters[key] = value; return query }, in: () => query, overrideTypes: () => query,
      then: (resolve: (value: unknown) => unknown) => {
        if (table === 'faction_lv2') assert.equal(filters.id, 'selected')
        const data = table === 'faction_lv1' ? [{ id: 'r', slug: 'r', name: 'Region' }] : table === 'faction_lv2' ? [myth]
          : table === 'celebs' ? [{ id: 'person', slug: 'person', nickname: 'Person' }] : []
        return Promise.resolve({ data, error: null }).then(resolve)
      } }
    return query
  } }
  const mocks: Record<string, unknown> = {
    react: { cache: (fn: unknown) => fn },
    '@/lib/compressedJsonCache': { compressedJsonCache: (fn: (...args: unknown[]) => Promise<unknown>) => async (...args: unknown[]) => { inCache = true; try { return await fn(...args) } finally { inCache = false } } },
    '@feelandnote/shared/constants/cache-tags': { CACHE_TAGS: {} }, '@/lib/cache': { STATIC_REVALIDATE: 604800 },
    '@/lib/db/static': { createStaticClient: () => db },
    './getMythIndex': { getMythIndex: async () => { assert.equal(inCache, false, 'index cache must be read outside detail cache'); return index } },
    '@/components/features/user/explore/myth/mythHref': { MYTH_OPENING_SLUG: 'selected' },
    '@/lib/faction-members': { selectVisibleFactionMembers: async (_db: unknown, _select: string, wanted: string[]) => { ids.push(wanted); return [{ lv2_id: 'selected', celeb_id: 'person' }] } },
    '@feelandnote/shared/lib/paginate': { selectInChunks: async (wanted: string[], fn: (ids: string[]) => PromiseLike<{ data: unknown }>) => { ids.push(wanted); return (await fn(wanted)).data } },
    '@/actions/figure-books/figureBookAssignments': { getFigureBookAssignmentsByCelebs: async (wanted: string[]) => { ids.push(wanted); return [{ content_id: 'book', celeb_id: 'person', relation_type: 'appeared' }] } },
    '@/actions/figure-books/figureBookCatalog': { loadFigureBookCatalog: async (_db: unknown, wanted: string[]) => { ids.push(wanted); return { contents: [{ id: 'book', type: 'BOOK', content_locales: [] }], editions: new Map() } } },
    '@/lib/utils/content-locale': { flattenLocales: () => ({ title: 'Book' }) },
    '@/lib/books/bookShelf': { resolveBookShelfBook: () => ({ title: 'Book' }) }, '@/lib/faction-music': { toFactionMusic: () => null },
    '@feelandnote/shared/lib/faction-team-image': { toTeamImages: () => [], toSceneImages: () => [] },
    './mythTypes': { GRAVES_GREEK_MYTHS_ID: 'special', MYTH_OTHER_GROUP_ID: 'other' },
  }
  const loaded = { exports: {} as { getMythData: (locale: string, slug: string) => Promise<typeof index> } }
  new Function('require', 'module', 'exports', compiled)((key: string) => { assert.ok(key in mocks, key); return mocks[key] }, loaded, loaded.exports)
  const result = await loaded.exports.getMythData('ko', 'selected')
  assert.equal(result.myths.length, 2)
  assert.equal(result.people.length, 1)
  assert.equal(result.works.length, 1)
  assert.ok(ids.every(values => JSON.stringify(values) === '["selected"]' || JSON.stringify(values) === '["person"]' || JSON.stringify(values) === '["book"]'))
})
