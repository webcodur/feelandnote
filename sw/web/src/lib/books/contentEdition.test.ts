import assert from 'node:assert/strict'
import test from 'node:test'
import { applyContentBookEdition, getContentDetailHref, selectContentBookEdition, type ContentBookEdition } from './contentEdition'
import type { ContentDetailData } from '@/actions/contents/getContentDetail'
import { attachFigureBookLocaleLinks, mergeFigureBookEditions, type FigureBookEditionRow, type FigureBookPurchaseOptionRow } from '@/actions/figure-books/figureBookLocale'

const edition: ContentBookEdition = { id: 12, locale: 'en', title: 'Second volume', creator: 'Original Author',
  description: 'This edition only', bookIntroduction: { isbn: '9780140432169', source: 'OPEN', sourceUrl: 'https://openlibrary.org/books/OL1M' },
  isbn: '9780140432169', publisher: 'Edition publisher', thumbnailUrl: 'https://example.test/edition-cover', releaseDate: '2022-01-01',
  editionKind: 'volume', textScope: 'volume 2', sortOrder: 1, platform: 'amazon', purchaseUrl: 'https://amazon.com/example' }
const content: ContentDetailData['content'] = { id: 'work-id', externalId: 'old-edition-isbn', type: 'BOOK', category: 'book',
  title: 'Default edition', creator: 'Default author', thumbnail: 'https://example.test/default-cover', description: 'Default introduction',
  metadata: { isbn: '9788991290808', publisher: 'Default publisher', link: 'https://example.test/default-book', original: 'keep' },
  purchaseEditionId: 1, bookEditions: [edition], affiliateLinks: [{ platform: 'coupang', url: 'https://example.test/default-product' }] }

test('edition deep links carry only positive safe integer physical IDs; synthetic locale and absent IDs remain work links', () => {
  assert.equal(getContentDetailHref('work-id', 12), '/content/work-id?category=book&editionId=12')
  assert.equal(getContentDetailHref('work-id', '12'), getContentDetailHref('work-id', 12))
  for (const id of [undefined, null, 'locale:ko', 'locale:en', '', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1e3']) {
    assert.equal(getContentDetailHref('work-id', id), '/content/work-id?category=book')
  }
})

test('explicit same-work edition replaces cover/introduction/ISBN/purchase together while retaining work ID and originals', () => {
  const before = structuredClone(content)
  const selected = selectContentBookEdition(content, ['12'])
  assert.equal(selected.status, 'selected')
  assert.equal(selected.content.id, content.id)
  assert.equal(selected.content.externalId, content.externalId)
  assert.equal(selected.content.title, edition.title)
  assert.equal(selected.content.thumbnail, edition.thumbnailUrl)
  assert.equal(selected.content.description, edition.description)
  assert.deepEqual(selected.content.bookIntroduction, edition.bookIntroduction)
  assert.equal(selected.content.editionLocale, 'en')
  assert.equal(selected.content.metadata?.isbn, edition.isbn)
  assert.equal(selected.content.metadata?.publisher, edition.publisher)
  assert.equal(selected.content.metadata?.original, 'keep')
  assert.equal(selected.content.metadata?.link, undefined)
  assert.deepEqual(selected.content.affiliateLinks, [{ platform: edition.platform, url: edition.purchaseUrl }])
  assert.deepEqual(content, before)
})

test('missing edition fields never fall back to another edition and absent query preserves default/no-edition/nonbook', () => {
  const selected = applyContentBookEdition(content, { ...edition, thumbnailUrl: null, creator: null, isbn: null, publisher: null,
    description: null, bookIntroduction: null, purchaseUrl: null, releaseDate: null })
  assert.equal(selected.thumbnail, undefined); assert.equal(selected.creator, undefined)
  assert.equal(selected.metadata?.isbn, null); assert.equal(selected.metadata?.publisher, null)
  assert.equal(selected.description, undefined); assert.equal(selected.bookIntroduction, null)
  assert.equal(selected.releaseDate, undefined); assert.deepEqual(selected.affiliateLinks, [])
  for (const work of [content, { ...content, bookEditions: [] }, { ...content, type: 'VIDEO' as const }]) {
    const result = selectContentBookEdition(work, [])
    assert.equal(result.status, 'default'); assert.equal(result.content, work)
  }
})

test('malformed/duplicate/cross-work/missing physical IDs cannot silently select the default or a foreign edition', () => {
  for (const values of [['0'], ['-1'], ['1.5'], ['1e3'], [' 12'], ['12', '12'], ['locale:ko'], ['9007199254740992']]) {
    assert.equal(selectContentBookEdition(content, values).status, 'invalid')
  }
  assert.equal(selectContentBookEdition(content, ['999']).status, 'unavailable')
  assert.equal(selectContentBookEdition({ ...content, bookEditions: [] }, ['12']).status, 'unavailable')
  assert.equal(selectContentBookEdition({ ...content, type: 'VIDEO' }, ['12']).status, 'invalid')
})

test('full detail edition list retains English editions without products and attaches products only to their own ISBN', () => {
  const rows: FigureBookEditionRow[] = [1, 2].map(id => ({ id, content_id: 'work-id', locale: 'en', title: `Edition ${id}`,
    creator: 'Original Author', description: null, isbn: id === 1 ? '9780140432169' : '9788991290808', publisher: 'Publisher',
    thumbnail_url: null, release_date: null, edition_kind: null, text_scope: null, sort_order: id }))
  const product: FigureBookPurchaseOptionRow = { ...rows[0], edition_id: 1, platform: 'amazon', affiliate_url: 'https://amazon.com/edition1' }
  assert.deepEqual(mergeFigureBookEditions(rows, [product], 'en').map(row => row.id), [1])
  const all = mergeFigureBookEditions(rows, [product], 'en', true)
  assert.deepEqual(all.map(row => row.id), [1, 2])
  assert.equal(all[0].purchaseUrl, product.affiliate_url)
  assert.equal(all[1].purchaseUrl, null)
  assert.equal(mergeFigureBookEditions(rows, [{ ...product, isbn: rows[1].isbn }], 'en', true)[0].purchaseUrl, null)
})

test('same actual locale ISBN retains verified existing links, while another ISBN, language or unknown attribution cannot borrow them', () => {
  const raw = { locale: 'en', isbn: '0140432167', sources: { primary: 'openlibrary' },
    affiliate_url: [{ platform: 'amazon', url: 'https://amazon.com/same-edition' }, { platform: 'coupang', url: 'https://coupang.com/wrong-language' },
      { platform: 'amazon', url: 'javascript:alert(1)' }] }
  // Use the actual checked ISBN10 equivalent, not a guessed check digit.
  raw.isbn = '0140432167'
  const attached = attachFigureBookLocaleLinks(edition, raw)
  assert.deepEqual(attached.affiliateLinks, [{ platform: 'amazon', url: 'https://amazon.com/same-edition' }])
  assert.deepEqual(applyContentBookEdition(content, attached).affiliateLinks, [
    { platform: 'amazon', url: edition.purchaseUrl }, { platform: 'amazon', url: 'https://amazon.com/same-edition' }])
  for (const changed of [{ ...raw, isbn: '9788991290808' }, { ...raw, locale: 'ko' },
    { ...raw, sources: { primary: 'none' } }, { ...raw, sources: { primary: 'kakao_book' } }, { ...raw, sources: {} }]) {
    assert.deepEqual(attachFigureBookLocaleLinks(edition, changed).affiliateLinks, [])
  }
})
