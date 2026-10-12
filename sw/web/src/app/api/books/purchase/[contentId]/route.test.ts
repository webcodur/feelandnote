import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import * as policy from '@feelandnote/content-search/book-edition-policy'
import * as isbn from '@feelandnote/content-search/book-isbn'
import * as redirects from '../../../../../lib/books/bookPurchaseRedirect'
import * as yes24 from '../../../../../lib/books/yes24Purchase'
import * as amazon from '../../../../../lib/books/amazonBookSearch'
import * as affiliatePlatforms from '../../../../../constants/affiliatePlatforms'
const contentId = '0f391685-451f-4d33-85b2-66e140f6a3c0'
const otherContentId = 'aba30ef6-4d9b-4f18-bab6-7e2209893df5'
const selectedIsbn = '9780141439518'
const alternateIsbn = '9780141439600'
const title = '엠마'
const creator = '제인 오스틴'
const compiled = ts.transpileModule(readFileSync(new URL('./route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
type TestRow = { id?: number | string; type?: string; metadata?: unknown; content_id?: string; locale?: string;
  isbn?: string | null; title?: string; creator?: string; sources?: unknown; edition_kind?: string;
  edition_id?: number; platform?: string; affiliate_url?: unknown }
type TestRows = Record<'contents' | 'content_locales' | 'figure_book_editions' | 'figure_book_purchase_options', TestRow | null>
const localeColumns = new Set(['content_id', 'locale', 'isbn', 'title', 'creator', 'publisher', 'sources', 'affiliate_url'])
function selectionSources(reason = 'editorial_exclusion', boundContentId = contentId) {
  return { edition_selection_evidence: [{ method: 'independent_selection_review', isbn: selectedIsbn,
    locale: 'ko', edition_title: title, reason, content_id: boundContentId,
    source_url: 'https://publisher.example.test/emma', explanation: '이 판본의 본문과 번역 문제를 확인하여 해당 상품을 선정에서 제외한다.' }] }
}
function loadRoute(overrides: Partial<TestRows> = {}, errorTable?: keyof TestRows) {
  const rows: TestRows = {
    contents: { id: contentId, type: 'BOOK', metadata: {} },
    content_locales: { content_id: contentId, locale: 'ko', isbn: selectedIsbn, title, creator, sources: {} },
    figure_book_editions: { id: 17, content_id: contentId, locale: 'ko', isbn: selectedIsbn, title, creator, sources: {}, edition_kind: 'full' },
    figure_book_purchase_options: null,
    ...overrides,
  }
  let lookups = 0
  const mocks = new Map<string, unknown>([
    ['@/actions/contents/getYes24PurchaseLink', { getYes24PurchaseLink: async () => { lookups += 1; return null } }],
    ['@/lib/db/static', { createStaticClient: () => ({ from: (table: keyof TestRows) => {
      let columns: (keyof TestRow)[] = []
      const query = {
        select: (value: string) => {
          columns = value.split(',') as (keyof TestRow)[]
          if (table === 'content_locales') assert.ok(columns.every(column => localeColumns.has(column)), `Unknown locale column: ${value}`)
          return query
        },
        eq: () => query,
        maybeSingle: async () => ({ data: rows[table] ? Object.fromEntries(columns.map(column => [column, rows[table]![column]])) : null,
          error: table === errorTable ? new Error('DB unavailable') : null }),
      }
      return query
    } }) }],
    ['@/lib/books/yes24Purchase', yes24],
    ['@/lib/books/bookPurchaseRedirect', redirects],
    ['@feelandnote/content-search/book-edition-policy', policy],
    ['@feelandnote/content-search/book-isbn', isbn],
    ['@/constants/affiliatePlatforms', affiliatePlatforms],
    ['@/lib/books/amazonBookSearch', amazon],
  ])
  const loaded = { exports: {} as { GET: (request: Request, context: { params: Promise<{ contentId: string }> }) => Promise<Response> } }
  new Function('require', 'module', 'exports', compiled)((id: string) => {
    assert.ok(mocks.has(id), `Unexpected import: ${id}`)
    return mocks.get(id)
  }, loaded, loaded.exports)
  return { rows, lookups: () => lookups, get: (query = '') => loaded.exports.GET(
    new Request(`https://feelandnote.com/api/books/purchase/${contentId}${query}`), { params: Promise.resolve({ contentId }) }) }
}
test('normal stored BOOK locale and selected edition retain all four store redirects', async () => {
  const route = loadRoute()
  for (const seller of ['yes24', 'kyobo', 'coupang', 'aladin']) {
    for (const edition of ['', '&editionId=17']) {
      const response = await route.get(`?seller=${seller}${edition}`)
      assert.equal(response.status, 307)
      assert.match(response.headers.get('location')!, /^https:\/\//)
      assert.match(response.headers.get('cache-control')!, /no-store/)
    }
  }
})
test('actual locale columns keep Korean and English purchases out of the DB failure fallback', async () => {
  const route = loadRoute()
  assert.equal(new URL((await route.get('?seller=aladin')).headers.get('location')!).hostname, 'www.aladin.co.kr')
  route.rows.content_locales!.locale = 'en'
  assert.equal(new URL((await route.get('?locale=en')).headers.get('location')!).hostname, 'www.amazon.com')
})
test('saved locale links and exact edition products keep their affiliate destination after selection checks', async () => {
  const route = loadRoute()
  route.rows.content_locales!.affiliate_url = [{ platform: 'coupang', url: 'https://link.coupang.com/a/locale' }]
  assert.equal((await route.get('?seller=coupang')).headers.get('location'), 'https://link.coupang.com/a/locale')
  assert.equal((await route.get('?seller=coupang&editionId=17')).headers.get('location'), 'https://link.coupang.com/a/locale')
  route.rows.figure_book_editions!.isbn = alternateIsbn
  assert.equal(new URL((await route.get('?seller=coupang&editionId=17')).headers.get('location')!).searchParams.get('q'), alternateIsbn)
  route.rows.figure_book_purchase_options = { edition_id: 17, content_id: contentId, locale: 'ko', isbn: alternateIsbn,
    platform: 'coupang', affiliate_url: 'https://link.coupang.com/a/edition' }
  assert.equal((await route.get('?seller=coupang&editionId=17')).headers.get('location'), 'https://link.coupang.com/a/edition')
  route.rows.figure_book_purchase_options.edition_id = 18
  assert.equal((await route.get('?seller=coupang&editionId=17')).status, 400)
})
test('English default and selected editions preserve tagged Amazon products and exact ISBN search', async () => {
  const route = loadRoute()
  route.rows.content_locales!.locale = 'en'
  route.rows.figure_book_editions!.locale = 'en'
  route.rows.content_locales!.affiliate_url = [{ platform: 'amazon', url: 'https://www.amazon.com/dp/0141439513' }]
  const saved = await route.get('?locale=en&seller=amazon')
  assert.equal(saved.status, 307)
  assert.equal(new URL(saved.headers.get('location')!).pathname, '/dp/0141439513')
  assert.equal(new URL(saved.headers.get('location')!).searchParams.get('tag'), 'feelandnote-20')
  route.rows.figure_book_editions!.isbn = alternateIsbn
  const selected = await route.get('?locale=en&seller=amazon&editionId=17')
  assert.equal(selected.status, 307)
  assert.equal(new URL(selected.headers.get('location')!).searchParams.get('k'), alternateIsbn)
  route.rows.figure_book_purchase_options = { edition_id: 17, content_id: contentId, locale: 'en', isbn: alternateIsbn,
    platform: 'amazon', affiliate_url: 'https://amzn.to/exact-edition' }
  assert.equal((await route.get('?locale=en&editionId=17')).headers.get('location'), 'https://amzn.to/exact-edition')
})
test('English route exclusion is bound to that edition and cross-locale or URL query bypasses are rejected', async () => {
  const route = loadRoute()
  route.rows.content_locales!.sources = selectionSources()
  route.rows.figure_book_editions!.locale = 'en'
  route.rows.content_locales!.locale = 'en'
  assert.equal((await route.get('?locale=en&seller=amazon&editionId=17')).status, 307)
  const sources = selectionSources()
  sources.edition_selection_evidence[0].locale = 'en'
  route.rows.content_locales!.sources = sources
  assert.equal((await route.get('?locale=en&seller=amazon&editionId=17')).status, 400)
  for (const query of ['?locale=en&seller=coupang', '?locale=ko&seller=amazon', '?locale=en&locale=ko', '?locale=fr', '?locale=en&url=https://amazon.com']) {
    assert.equal((await route.get(query)).status, 400)
  }
  const unavailable = await loadRoute({}, 'figure_book_purchase_options').get('?editionId=17&seller=coupang')
  assert.equal(unavailable.headers.get('location'), redirects.getBookPurchaseFallback(contentId))
})
test('selected locale exclusion blocks every seller and never calls YES24', async () => {
  const route = loadRoute({ content_locales: { content_id: contentId, locale: 'ko', isbn: selectedIsbn, title, creator, sources: selectionSources() } })
  for (const seller of ['yes24', 'kyobo', 'coupang', 'aladin']) {
    const response = await route.get(`?seller=${seller}`)
    assert.equal(response.status, 400)
    assert.equal(response.headers.get('location'), null)
  }
  assert.equal(route.lookups(), 0)
})
test('direct editionId cannot bypass same-ISBN locale proof while another ISBN stays available', async () => {
  const route = loadRoute({ content_locales: { content_id: contentId, locale: 'ko', isbn: '0-14-143951-3', title, creator, sources: selectionSources() } })
  assert.equal((await route.get('?editionId=17&seller=aladin')).status, 400)
  route.rows.figure_book_editions!.isbn = alternateIsbn
  const allowed = await route.get('?editionId=17&seller=aladin')
  assert.equal(allowed.status, 307)
  assert.equal(new URL(allowed.headers.get('location')!).searchParams.get('ISBN'), alternateIsbn)
})
test('a selected real edition uses its own selection proof even without a locale card', async () => {
  const route = loadRoute({ content_locales: null, figure_book_editions: {
    id: 17, content_id: contentId, locale: 'ko', isbn: selectedIsbn, title, creator, sources: selectionSources(),
  } })
  assert.equal((await route.get('?editionId=17&seller=kyobo')).status, 400)
})
test('wrong-work proof is bound to the current content rather than a copied ISBN alone', async () => {
  const route = loadRoute({ figure_book_editions: {
    id: 17, content_id: contentId, locale: 'ko', isbn: selectedIsbn, title, creator, sources: selectionSources('wrong_work', otherContentId),
  } })
  assert.equal((await route.get('?editionId=17&seller=coupang')).status, 307)
  route.rows.figure_book_editions!.sources = selectionSources('wrong_work')
  assert.equal((await route.get('?editionId=17&seller=coupang')).status, 400)
})
test('missing and stale or foreign edition requests never substitute a different edition', async () => {
  assert.equal((await loadRoute({ content_locales: null }).get('?seller=aladin')).status, 400)
  assert.equal((await loadRoute({ figure_book_editions: null }).get('?editionId=17')).status, 400)
  for (const changed of [{ id: 18 }, { content_id: otherContentId }, { locale: 'en' }]) {
    const route = loadRoute()
    Object.assign(route.rows.figure_book_editions!, changed)
    assert.equal((await route.get('?editionId=17&seller=aladin')).status, 400)
  }
})

test('DB failures preserve the internal content fallback and never synthesize a store search', async () => {
  for (const table of ['contents', 'content_locales', 'figure_book_editions'] as const) {
    const route = loadRoute({}, table)
    const response = await route.get('?editionId=17&seller=aladin')
    assert.equal(response.status, 307)
    assert.equal(response.headers.get('location'), redirects.getBookPurchaseFallback(contentId))
    assert.equal(route.lookups(), 0)
  }
})

test('work-level exclusion blocks ISBN-less title searches and direct editionId for the bound work', async () => {
  const proof = { method: 'independent_work_selection_review', content_id: contentId, work_title: title, work_creator: creator,
    work_identity: 'wikidata:q181558', reason: 'editorial_exclusion', source_url: 'https://publisher.example.test/emma',
    explanation: '이 작품의 본문과 독서 가치를 검토하여 해당 작품 전체를 선정에서 제외한다.' }
  const figureBook = { workTitle: title, workCreator: creator, workIdentity: proof.work_identity, workSelectionEvidence: [proof] }
  const route = loadRoute({ contents: { id: contentId, type: 'BOOK', metadata: { figureBook } },
    content_locales: { content_id: contentId, locale: 'ko', isbn: null, title, creator, sources: {} } })
  for (const query of ['?seller=aladin', '?editionId=17&seller=coupang']) {
    const response = await route.get(query)
    assert.equal(response.status, 400)
    assert.equal(response.headers.get('location'), null)
  }
  figureBook.workIdentity = 'wikidata:q999999'
  const allowed = await route.get('?seller=aladin')
  assert.equal(allowed.status, 307)
  assert.equal(new URL(allowed.headers.get('location')!).searchParams.get('SearchWord'), `${title} ${creator}`)
})
