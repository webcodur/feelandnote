import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import * as redirects from './bookPurchaseRedirect'
import { isYes24PurchaseRequest } from './yes24Purchase'
import { getBookPurchaseHref } from './bookPurchaseHref'
import { BOOK_PURCHASE_REDIRECT_HEADERS, coupangBookLink, kyoboBookLink, LINKPRICE_COUPANG_APPROVED, resolveBookPurchaseRedirect, resolveCoupangPurchaseRedirect, resolveKyoboPurchaseRedirect, type BookPurchaseRecord } from './bookPurchaseRedirect'

const id = 'c53aab37-7ed8-42b6-9f06-929b8825c006'
const record: BookPurchaseRecord = { contentId: id, type: 'BOOK', locale: 'ko' }
const yes24 = { platform: 'yes24' as const, url: 'https://www.yes24.com/product/goods/123' }

test('purchase href keeps edition identity and response must never be cached or indexed', () => {
  assert.equal(getBookPurchaseHref(id), `/api/books/purchase/${id}`)
  assert.equal(getBookPurchaseHref(id, 23), `/api/books/purchase/${id}?editionId=23`)
  assert.equal(getBookPurchaseHref(id, 23, 'yes24'), `/api/books/purchase/${id}?editionId=23&seller=yes24`)
  assert.equal(getBookPurchaseHref(id, undefined, 'yes24'), `/api/books/purchase/${id}?seller=yes24`)
  assert.equal(getBookPurchaseHref(id, 23, 'kyobo'), `/api/books/purchase/${id}?editionId=23&seller=kyobo`)
  assert.equal(getBookPurchaseHref(id, 23, 'coupang'), `/api/books/purchase/${id}?editionId=23&seller=coupang`)
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
    assert.equal(resolveKyoboPurchaseRedirect(id, undefined, changed), null)
  }
  assert.equal(await resolveBookPurchaseRedirect(id, 2, record, async () => yes24), null)
  assert.equal(await resolveBookPurchaseRedirect(id, 2, { ...record, editionId: 2 }, async () => null), `/content/${id}?category=book`)
  assert.equal(resolveKyoboPurchaseRedirect(id, 2, record), null)
})

test('kyobo link wraps the bookstore barcode product URL in the LinkPrice gateway, else title search', () => {
  const product = kyoboBookLink({ isbn: '9788966260959', title: '클린 코드' })!
  const gateway = new URL(product.url)
  assert.equal(gateway.hostname, 'linkmoa.kr')
  assert.equal(gateway.pathname, '/click.php')
  assert.equal(gateway.searchParams.get('m'), 'kbbook')
  assert.equal(gateway.searchParams.get('a'), 'A100707726')
  const productUrl = new URL(gateway.searchParams.get('tu')!)
  assert.equal(productUrl.hostname, 'www.kyobobook.co.kr')
  assert.equal(productUrl.pathname, '/product/detailViewKor.laf')
  assert.equal(productUrl.searchParams.get('barcode'), '9788966260959')
  assert.equal(product.linkKind, undefined)
  const searched = kyoboBookLink({ title: '기억 & 기록', creator: '작가 이름' })!
  const searchUrl = new URL(new URL(searched.url).searchParams.get('tu')!)
  assert.equal(searchUrl.hostname, 'search.kyobobook.co.kr')
  assert.equal(searchUrl.searchParams.get('keyword'), '기억 & 기록 작가 이름')
  assert.equal(searched.linkKind, 'search')
  assert.equal(kyoboBookLink({}), null)
  assert.equal(kyoboBookLink({ isbn: 'invalid-isbn' }), null)
})

test('coupang link wraps the ISBN-or-title search URL in the LinkPrice gateway once approved', () => {
  const withIsbn = coupangBookLink({ isbn: '9788966260959', title: '클린 코드' })!
  const searched = coupangBookLink({ title: '기억 & 기록', creator: '작가 이름' })!
  if (!LINKPRICE_COUPANG_APPROVED) {
    // 머천트 승인대기 — 아래 형태 검증은 승인 후 플래그를 켤 때 스스로 살아난다
    assert.equal(LINKPRICE_COUPANG_APPROVED, false)
    return
  }
  const product = new URL(withIsbn.url)
  assert.equal(product.hostname, 'linkmoa.kr')
  assert.equal(product.searchParams.get('m'), 'coupang')
  assert.equal(product.searchParams.get('a'), 'A100707726')
  const destination = new URL(product.searchParams.get('tu')!)
  assert.equal(destination.hostname, 'www.coupang.com')
  assert.equal(destination.pathname, '/np/search')
  assert.equal(destination.searchParams.get('q'), '9788966260959')
  assert.equal(withIsbn.linkKind, 'search')
  assert.equal(new URL(new URL(searched.url).searchParams.get('tu')!).searchParams.get('q'), '기억 & 기록 작가 이름')
  assert.equal(coupangBookLink({}), null)
})

test('coupang redirect holds the content page while the merchant approval is pending', () => {
  const withIsbn = { ...record, editionId: 2, isbn: '9791158881931', title: 'HHhH' }
  const target = resolveCoupangPurchaseRedirect(id, 2, withIsbn)!
  if (!LINKPRICE_COUPANG_APPROVED) {
    assert.equal(target, `/content/${id}?category=book`)
  } else {
    const gateway = new URL(target)
    assert.equal(gateway.searchParams.get('m'), 'coupang')
    assert.equal(new URL(gateway.searchParams.get('tu')!).searchParams.get('q'), '9791158881931')
  }
  assert.equal(resolveCoupangPurchaseRedirect(id, undefined, { ...record, contentId: 'other' }), null)
  assert.equal(resolveCoupangPurchaseRedirect(id, undefined, record), `/content/${id}?category=book`)
})

test('kyobo redirect uses the stored edition ISBN and falls back to the content page without identifiers', () => {
  const withIsbn = { ...record, editionId: 2, isbn: '9791158881931', title: 'HHhH' }
  const target = new URL(resolveKyoboPurchaseRedirect(id, 2, withIsbn)!)
  assert.equal(target.hostname, 'linkmoa.kr')
  assert.equal(new URL(target.searchParams.get('tu')!).searchParams.get('barcode'), '9791158881931')
  assert.equal(resolveKyoboPurchaseRedirect(id, undefined, record), `/content/${id}?category=book`)
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
test('GET seller=kyobo resolves the stored ISBN to the LinkPrice Kyobo URL without the YES24 API', async () => {
  const f = routeFixture()
  const response = await f.read('?seller=kyobo')
  assert.equal(response.status, 307)
  const location = new URL(response.headers.get('location')!)
  assert.equal(location.hostname, 'linkmoa.kr')
  assert.equal(location.searchParams.get('m'), 'kbbook')
  const destination = new URL(location.searchParams.get('tu')!)
  assert.equal(destination.hostname, 'www.kyobobook.co.kr')
  assert.equal(destination.pathname, '/product/detailViewKor.laf')
  assert.equal(destination.searchParams.get('barcode'), '9788966260959')
  const edition = await f.read('?editionId=2&seller=kyobo')
  assert.equal(new URL(new URL(edition.headers.get('location')!).searchParams.get('tu')!).searchParams.get('barcode'), '9791158881931')
  f.rows.figure_book_editions = { id: 2, content_id: 'other-content', locale: 'ko', isbn: '9791158881931' }
  assert.equal((await f.read('?editionId=2&seller=kyobo')).status, 400)
})
test('GET seller=coupang accepts the seller param and resolves to search while pending approval', async () => {
  const f = routeFixture()
  const response = await f.read('?seller=coupang')
  assert.equal(response.status, 307)
  const location = new URL(response.headers.get('location')!, 'http://localhost')
  if (!LINKPRICE_COUPANG_APPROVED) {
    assert.equal(location.pathname, `/content/${id}`)
  } else {
    assert.equal(location.hostname, 'linkmoa.kr')
    assert.equal(location.searchParams.get('m'), 'coupang')
    assert.equal(new URL(location.searchParams.get('tu')!).searchParams.get('q'), '9788966260959')
  }
  f.rows.figure_book_editions = { id: 2, content_id: 'other-content', locale: 'ko', isbn: '9791158881931' }
  assert.equal((await f.read('?editionId=2&seller=coupang')).status, 400)
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
