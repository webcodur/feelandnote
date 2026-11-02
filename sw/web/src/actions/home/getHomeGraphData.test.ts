import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import type { HomeGraphData, HomeGraphMode } from '@/components/features/home/introduction/types'

const require = createRequire(import.meta.url)

function fixture(emptyLocal = false) {
  const countries: Record<string, string> = { local1: 'KR', local2: 'KR', american: 'US', local3: 'KR' }
  const realityFilters: unknown[] = []
  const directory = ['local1', 'american', 'local2', 'local3'].map(slug => ({ id: slug, slug, nationality: countries[slug] }))
  const mocks: Record<string, unknown> = {
    '@/lib/cache': { STATIC_REVALIDATE: 1, cachedList: (_tag: string, _keys: string[], load: () => unknown) => load(), throwOnQueryError() {} },
    './getHomePeople': { getHomePeople: async () => directory },
    '@/lib/db/static': { createStaticClient: () => ({ from() {
      let slug = ''
      const query = {
        select: () => query,
        eq(field: string, value: string) { if (field === 'slug') slug = value; return query },
        in(_field: string, values: unknown) { realityFilters.push(values); return query },
        async maybeSingle() { return { data: countries[slug] ? { id: slug, slug, nickname: slug, avatar_url: 'avatar', nationality: countries[slug] } : null, error: null } },
      }
      return query
    } }) },
    '@/actions/contents/getUserContents': { getPublicUserContents: async ({ userId, type }: { userId: string; type: string }) => ({
      total: 1,
      items: type === 'BOOK' && !(emptyLocal && userId === 'local1') ? [{
        content_id: userId + '-book', source_url: 'https://source.test/evidence',
        public_record: { content_preview: '감상', content_preview_en: 'Review' },
        content: { type: 'BOOK', title: 'Book', thumbnail_url: 'cover', bookLocale: { title: 'Book', thumbnail_url: 'cover' } },
      }] : [],
    }) },
    '@/actions/figure-books/getFigureBookPresentations': { getFigureBookPresentationsForCeleb: async () => [] },
    '@/actions/celebs/getCelebFactionBooks': { getCelebFactionBooks: async () => [] },
    '@/lib/celeb/authoredBooks': { getDisplayFigureBookGroups: () => ({ appeared: [], authored: [] }) },
    '@/lib/books/bookShelf': { isBookShelfAvailable: () => true },
    '@feelandnote/content-search/book-edition-policy': { excludedBookEditionReason: () => null },
  }
  const source = ts.transpileModule(readFileSync(new URL('./getHomeGraphData.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const loaded = { exports: {} as { getHomeGraphDeck: (mode: HomeGraphMode, locale: string, country: string) => Promise<HomeGraphData[]> } }
  new Function('require', 'module', 'exports', source)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  return { get: loaded.exports.getHomeGraphDeck, realityFilters }
}

test('both upper home sections use the rotating local and American directory without a fixed representative', async () => {
  const f = fixture()
  for (const mode of ['appreciations', 'books'] as const) {
    const deck = await f.get(mode, 'ko', 'KR')
    assert.deepEqual(deck.map(data => data.person.nationality), ['KR', 'US', 'KR'])
    assert.deepEqual(deck.map(data => data.person.slug), ['local1', 'american', 'local2'])
    assert.ok(deck.every(data => data.branches.some(branch => branch.items.length)))
    assert.ok(deck.every(data => data.branches.some(branch => !branch.items.length)), 'Missing media or relations must not discard an otherwise useful local person')
  }
  assert.ok(f.realityFilters.every(values => JSON.stringify(values) === '["REAL","BOTH"]'))
})

test('an empty local profile is skipped while keeping the available local and American people', async () => {
  const deck = await fixture(true).get('appreciations', 'en', 'KR')
  assert.equal(deck.length, 3)
  assert.ok(deck.some(data => data.person.slug === 'local2'))
  assert.ok(deck.some(data => data.person.nationality === 'US'))
  assert.equal(deck.some(data => data.person.slug === 'local1'), false)
})
