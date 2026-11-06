import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import type { HomeGraphData, HomeGraphMode } from '@/components/features/home/introduction/types'
import type { ContentType } from '@/types/database'

const require = createRequire(import.meta.url)

function fixture(emptyLocal = false, media: ContentType = 'BOOK', validSlugs?: string[]) {
  const countries: Record<string, string> = { local1: 'KR', american: 'US', local2: 'KR', local3: 'KR', american2: 'US', japanese: 'JP', french: 'FR', british: 'GB' }
  const realityFilters: unknown[] = []
  const requestedMedia: string[] = []
  const directory = Object.keys(countries).map(slug => ({ id: slug, slug, nationality: countries[slug] }))
  const mocks: Record<string, unknown> = {
    '@/lib/cache': { STATIC_REVALIDATE: 1, cachedList: (_tag: string, _keys: string[], load: () => unknown) => load(), throwOnQueryError() {} },
    './getHomePeople': { getHomeShowcasePeople: async () => directory },
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
    '@/actions/contents/getUserContents': { getPublicUserContents: async ({ userId, type }: { userId: string; type: string }) => { requestedMedia.push(type); return ({
      total: 1,
      items: type === media && !(emptyLocal && userId === 'local1') && (!validSlugs || validSlugs.includes(userId)) ? [{
        content_id: userId + '-book', source_url: 'https://source.test/evidence',
        public_record: { content_preview: '감상', content_preview_en: 'Review' },
        content: { type: media, title: 'Work', thumbnail_url: 'cover', bookLocale: { title: 'Book', thumbnail_url: 'cover' } },
      }] : [],
    }) } },
    '@/actions/figure-books/getFigureBookPresentations': { getFigureBookPresentationsForCeleb: async () => [] },
    '@/actions/celebs/getCelebFactionBooks': { getCelebFactionBooks: async () => [] },
    '@/lib/celeb/authoredBooks': { getDisplayFigureBookGroups: () => ({ appeared: [], authored: [] }) },
    '@/lib/books/bookShelf': { isBookShelfAvailable: () => true },
    '@feelandnote/content-search/book-edition-policy': { excludedBookEditionReason: () => null },
  }
  const source = ts.transpileModule(readFileSync(new URL('./getHomeGraphData.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const loaded = { exports: {} as { getHomeGraphDeck: (mode: HomeGraphMode, locale: string) => Promise<HomeGraphData[]> } }
  new Function('require', 'module', 'exports', source)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports)
  return { get: loaded.exports.getHomeGraphDeck, realityFilters, requestedMedia }
}

test('both upper home sections keep the ranked order without repeating anyone', async () => {
  const f = fixture()
  const appreciations = await f.get('appreciations', 'ko')
  const books = await f.get('books', 'ko')
  assert.deepEqual(appreciations.map(data => data.person.slug), ['local1', 'american', 'local2'])
  assert.deepEqual(books.map(data => data.person.slug), ['local3', 'american2', 'japanese'])
  for (const deck of [appreciations, books]) {
    assert.ok(deck.every(data => data.branches.some(branch => branch.items.length)))
    assert.ok(deck.every(data => data.branches.some(branch => !branch.items.length)), 'Missing media or relations must not discard an otherwise useful local person')
  }
  assert.ok(f.realityFilters.every(values => JSON.stringify(values) === '["REAL","BOTH"]'))
})

test('an empty local profile is skipped while keeping the available local and American people', async () => {
  const deck = await fixture(true).get('appreciations', 'en')
  assert.equal(deck.length, 3)
  assert.ok(deck.some(data => data.person.slug === 'local2'))
  assert.ok(deck.some(data => data.person.nationality === 'US'))
  assert.equal(deck.some(data => data.person.slug === 'local1'), false)
})

test('a person with one available medium stays eligible and carries all four categories in the same bookshelf', async () => {
  for (const media of ['BOOK', 'MUSIC', 'VIDEO', 'GAME'] as const) {
    const f = fixture(false, media)
    const deck = await f.get('appreciations', 'ko')
    assert.deepEqual(deck.map(data => data.person.nationality), ['KR', 'US', 'KR'])
    assert.ok(deck.every(data => data.branches.length === 4 && data.branches.filter(branch => branch.items.length).length === 1
      && data.branches.find(branch => branch.key === media)?.items.every(item => item.text && item.sourceUrl)))
    assert.deepEqual([...new Set(f.requestedMedia)], ['BOOK', 'MUSIC', 'VIDEO', 'GAME'])
  }
})

test('later candidates fill the person list when earlier ones have no displayable appreciation', async () => {
  const f = fixture(false, 'GAME', ['japanese', 'french', 'british'])
  const deck = await f.get('appreciations', 'ko')
  assert.deepEqual(deck.map(data => data.person.nationality), ['JP', 'FR', 'GB'])
  assert.ok(deck.every(data => data.branches.find(branch => branch.key === 'GAME')?.items[0].sourceUrl))
})
