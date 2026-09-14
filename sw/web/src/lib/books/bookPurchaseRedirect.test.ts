import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import * as redirects from './bookPurchaseRedirect'
import { isYes24PurchaseRequest } from './yes24Purchase'
import { getBookPurchaseHref } from './bookPurchaseHref'
import { BOOK_PURCHASE_REDIRECT_HEADERS, resolveBookPurchaseRedirect, type BookPurchaseRecord } from './bookPurchaseRedirect'

const id = 'c53aab37-7ed8-42b6-9f06-929b8825c006'
const record: BookPurchaseRecord = { contentId: id, type: 'BOOK', locale: 'ko' }
const yes24 = { platform: 'yes24' as const, url: 'https://www.yes24.com/product/goods/123' }

test('purchase href keeps edition identity and response must never be cached or indexed', () => {
  assert.equal(getBookPurchaseHref(id), `/api/books/purchase/${id}`)
  assert.equal(getBookPurchaseHref(id, 23), `/api/books/purchase/${id}?editionId=23`)
  assert.equal(getBookPurchaseHref(id, 23, 'yes24'), `/api/books/purchase/${id}?editionId=23&seller=yes24`)
  assert.equal(getBookPurchaseHref(id, undefined, 'yes24'), `/api/books/purchase/${id}?seller=yes24`)
  assert.match(BOOK_PURCHASE_REDIRECT_HEADERS['Cache-Control'], /no-store/)
  assert.equal(BOOK_PURCHASE_REDIRECT_HEADERS['X-Robots-Tag'], 'noindex, nofollow')
})
test('YES24-specific links never redirect to Coupang when the API is unavailable', async () => {
  const withIsbn = { ...record, isbn: '9788966260959', title: '클린 코드', creator: '로버트 마틴' }
  const available = await resolveBookPurchaseRedirect(id, undefined, withIsbn, async () => yes24)
  assert.equal(available, yes24.url)
  for (const lookup of [async () => null, async () => { throw new Error('Unavailable') }]) {
    const target = new URL((await resolveBookPurchaseRedirect(id, undefined, withIsbn, lookup))!)
    assert.equal(target.hostname, 'www.yes24.com')
    assert.equal(target.pathname, '/Product/Search')
    assert.equal(target.searchParams.get('query'), '9788966260959')
  }
  const noIsbn = { ...record, title: '기억 & 기록', creator: '작가 이름' }
  const target = new URL((await resolveBookPurchaseRedirect(id, undefined, noIsbn, async () => null))!)
  assert.equal(target.searchParams.get('query'), '기억 & 기록 작가 이름')
  assert.equal(target.searchParams.size, 2)
})
test('absence of stored Korean ISBN and title returns the content instead of guessing an edition', async () => {
  assert.equal(await resolveBookPurchaseRedirect(id, undefined, record, async () => null), `/content/${id}?category=book`)
})
test('wrong content, language, type, or edition cannot use another edition as fallback', async () => {
  for (const changed of [null, { ...record, contentId: 'other' }, { ...record, locale: 'en' }, { ...record, type: 'VIDEO' }, { ...record, editionId: 2 }]) {
    let called = false
    assert.equal(await resolveBookPurchaseRedirect(id, undefined, changed, async () => { called = true; return yes24 }), null)
    assert.equal(called, false)
  }
  assert.equal(await resolveBookPurchaseRedirect(id, 2, record, async () => yes24), null)
  assert.equal(await resolveBookPurchaseRedirect(id, 2, { ...record, editionId: 2 }, async () => null), `/content/${id}?category=book`)
})

const compiled = ts.transpileModule(readFileSync(new URL('../../app/api/books/purchase/[contentId]/route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
function routeFixture() {
  const rows: Record<string, unknown> = {
    contents: { id, type: 'BOOK' },
    content_locales: { content_id: id, locale: 'ko', isbn: '9788966260959', title: '클린 코드' },
    figure_book_editions: { id: 2, content_id: id, locale: 'ko', isbn: '9791158881931', title: 'HHhH' },
  }
  const queries: { table: string; filters: Record<string, unknown> }[] = []
  const mocks: Record<string, unknown> = {
    '@/lib/books/bookPurchaseRedirect': redirects,
    '@/lib/books/yes24Purchase': { isYes24PurchaseRequest },
    '@/actions/contents/getYes24PurchaseLink': { getYes24PurchaseLink: async () => null },
    '@/lib/db/static': { createStaticClient: () => ({ from: (table: string) => {
      const query = { table, filters: {} as Record<string, unknown> }
      queries.push(query)
      const result = () => ({ data: rows[table], error: null })
      const builder = { select: () => builder, eq: (key: string, value: unknown) => { query.filters[key] = value; return builder },
        maybeSingle: async () => result(), then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve) }
      return builder
    } }) },
  }
  const loaded = { exports: {} as { GET: (request: Request, context: { params: Promise<{ contentId: string }> }) => Promise<Response> } }
  const require = createRequire(import.meta.url)
  new Function('require', 'module', 'exports', compiled)((key: string) => mocks[key] ?? require(key), loaded, loaded.exports)
  return { rows, queries, read: (query = '', contentId = id) => loaded.exports.GET(new Request(`http://localhost:3000/api/books/purchase/${contentId}${query}`), { params: Promise.resolve({ contentId }) }) }
}
test('GET rejects invalid UUID, duplicate edition, unsafe integer, and external URL parameters before DB calls', async () => {
  const f = routeFixture()
  assert.equal((await f.read('', 'isbn-not-content-id')).status, 400)
  for (const query of ['?editionId=0', '?editionId=-1', '?editionId=1.5', '?editionId=9007199254740992', '?editionId=1&editionId=2', '?url=https://evil.test', '?seller=evil', '?seller=yes24&seller=yes24']) {
    assert.equal((await f.read(query)).status, 400)
  }
  assert.equal(f.queries.length, 0)
})
test('GET seller=yes24 searches only the requested Korean edition without loading Coupang products', async () => {
  const f = routeFixture()
  const response = await f.read('?editionId=2&seller=yes24')
  assert.equal(response.status, 307)
  const location = new URL(response.headers.get('location')!)
  assert.equal(location.hostname, 'www.yes24.com')
  assert.equal(location.searchParams.get('query'), '9791158881931')
  assert.equal(f.queries.some(query => query.table === 'figure_book_purchase_options'), false)
  f.rows.figure_book_editions = { id: 2, content_id: 'other-content', locale: 'ko', isbn: '9791158881931' }
  assert.equal((await f.read('?editionId=2&seller=yes24')).status, 400)
})
test('GET uses exact stored edition filters, returns non-indexable no-store 307, and rejects ownership mismatch', async () => {
  const f = routeFixture()
  const result = await f.read('?editionId=2')
  assert.equal(result.status, 307)
  assert.equal(new URL(result.headers.get('location')!).hostname, 'www.yes24.com')
  assert.equal(new URL(result.headers.get('location')!).searchParams.get('query'), '9791158881931')
  assert.match(result.headers.get('cache-control')!, /no-store/)
  assert.equal(result.headers.get('x-robots-tag'), 'noindex, nofollow')
  assert.deepEqual(f.queries.find(query => query.table === 'figure_book_editions')?.filters, { id: 2, content_id: id, locale: 'ko' })
  f.rows.figure_book_editions = { id: 2, content_id: 'other-content', locale: 'ko' }
  assert.equal((await f.read('?editionId=2')).status, 400)
})
