import assert from 'node:assert/strict'
import test from 'node:test'
import { getBookPurchaseLinks } from './bookPurchaseLinks'
import { purchaseAffiliation } from './bookPurchaseRedirect'

const contentId = '0f391685-451f-4d33-85b2-66e140f6a3c0'

test('Korean registered editions carry their ID to all four store routes', () => {
  const links = getBookPurchaseLinks({ locale: 'ko', contentId, editionId: 17, title: 'Emma' })
  assert.deepEqual(links.map(link => link.platform), ['yes24', 'kyobo', 'coupang', 'aladin'])
  for (const link of links) {
    const url = new URL(link.url, 'https://feelandnote.com')
    assert.equal(url.pathname, `/api/books/purchase/${contentId}`)
    assert.equal(url.searchParams.get('editionId'), '17')
    assert.equal(url.searchParams.get('seller'), link.platform)
  }
})

test('registered English books always use the guarded Amazon route', () => {
  const links = getBookPurchaseLinks({ locale: 'en', contentId, title: 'Emma', creator: 'Jane Austen',
    links: [{ platform: 'coupang', url: 'https://link.coupang.com/a/example' },
      { platform: 'google_books', url: 'https://books.google.com/books?id=old' }], yes24Href: 'https://www.yes24.com/Product/Goods/1' })
  assert.equal(links.length, 1)
  const [link] = links
  assert.equal(link.platform, 'amazon')
  const url = new URL(link.url, 'https://feelandnote.com')
  assert.equal(url.pathname, `/api/books/purchase/${contentId}`)
  assert.equal(url.searchParams.get('seller'), 'amazon')
  assert.equal(url.searchParams.get('locale'), 'en')
  assert.equal(purchaseAffiliation(links[0]), 'affiliate')
})

test('selected English ISBN takes priority over a potentially ambiguous title', () => {
  const [link] = getBookPurchaseLinks({ locale: 'en', title: 'Different title', isbn: '0-14-143951-3' })
  assert.equal(new URL(link.url).searchParams.get('k'), '9780141439518')
})

test('a verified Amazon product beats preceding stale search and invalid same-platform links', () => {
  const links = getBookPurchaseLinks({ locale: 'en', title: 'Emma', links: [
    { platform: 'amazon', url: 'https://wrong.example.com/dp/123' },
    { platform: 'amazon', url: 'https://amazon.com/s?k=stale', linkKind: 'search' },
    { platform: 'amazon', url: 'https://www.amazon.com/dp/0141439513' },
  ] })
  assert.equal(links.length, 1)
  assert.equal(new URL(links[0].url).pathname, '/dp/0141439513')
})

test('invalid saved URLs do not hide a later valid store link', () => {
  const links = getBookPurchaseLinks({ locale: 'ko', contentId, links: [
    { platform: 'coupang', url: 'javascript:alert(1)' },
    { platform: 'coupang', url: 'https://link.coupang.com/a/valid' },
    { platform: 'aladin', url: '//other.example.com' },
    { platform: 'kyobo', url: 'https://user:secret@other.example.com' },
  ], yes24Href: '/\\other.example.com' })
  assert.ok(links.find(link => link.platform === 'coupang')?.url.startsWith('/api/books/purchase/'))
  assert.ok(links.find(link => link.platform === 'yes24')?.url.startsWith('/api/books/purchase/'))
  assert.ok(links.find(link => link.platform === 'kyobo')?.url.startsWith('/api/books/purchase/'))
})

test('external chart books use their confirmed store and ISBN without registered-work routes', () => {
  const links = getBookPurchaseLinks({ locale: 'ko', contentId: 'yes24-123', isbn: '9780141439518',
    yes24Href: 'https://www.yes24.com/Product/Goods/123' })
  assert.equal(links[0].url, 'https://www.yes24.com/Product/Goods/123')
  assert.ok(links.every(link => !link.url.startsWith('/api/')))
  assert.deepEqual(links.map(link => link.platform), ['yes24', 'kyobo', 'coupang', 'aladin'])
  assert.deepEqual(getBookPurchaseLinks({ locale: 'en' }), [])
})

test('registered Korean saved URLs and English saved products cannot bypass the guarded route', () => {
  const ko = getBookPurchaseLinks({ locale: 'ko', contentId, title: '엠마',
    yes24Href: 'https://www.yes24.com/Product/Goods/123',
    links: [{ platform: 'coupang', url: 'https://link.coupang.com/a/stored' }] })
  assert.equal(ko.length, 4)
  assert.ok(ko.every(link => link.url.startsWith(`/api/books/purchase/${contentId}`)))
  const en = getBookPurchaseLinks({ locale: 'en', contentId, editionId: 17,
    links: [{ platform: 'amazon', url: 'https://www.amazon.com/dp/0141439513' }] })
  const url = new URL(en[0].url, 'https://feelandnote.com')
  assert.equal(url.searchParams.get('editionId'), '17')
  assert.equal(url.searchParams.get('locale'), 'en')
})

test('selection evidence blocks saved store URLs and title search before links are constructed', () => {
  const sources = { edition_selection_evidence: [{ method: 'independent_selection_review', isbn: '9780141439518',
    locale: 'ko', edition_title: '엠마', reason: 'editorial_exclusion', content_id: contentId,
    source_url: 'https://publisher.example.test/emma', explanation: '이 판본의 본문과 번역 문제를 확인하여 해당 상품을 선정에서 제외한다.' }] }
  const options = { locale: 'ko', contentId, title: '엠마', creator: '제인 오스틴', isbn: '9780141439518', sources,
    links: [{ platform: 'coupang' as const, url: 'https://link.coupang.com/a/stored' }],
    yes24Href: 'https://www.yes24.com/Product/Goods/123' }
  assert.deepEqual(getBookPurchaseLinks(options), [])
  assert.equal(getBookPurchaseLinks({ ...options, isbn: '9780141439600' }).length, 4)
  assert.equal(getBookPurchaseLinks({ ...options, locale: 'en' }).length, 1)
  assert.equal(getBookPurchaseLinks({ ...options, contentId: 'aba30ef6-4d9b-4f18-bab6-7e2209893df5' }).length, 4)
})

test('authoritative blocked detail does not offer saved Korean or English purchase links', () => {
  for (const locale of ['ko', 'en']) {
    assert.deepEqual(getBookPurchaseLinks({ locale, contentId, title: 'Emma', bookPurchaseBlocked: true,
      links: [{ platform: 'amazon', url: 'https://www.amazon.com/dp/0141439513' }] }), [])
  }
})

test('work selection metadata blocks ISBN-less searches and saved English products only for its bound work', () => {
  const metadata = { figureBook: { workTitle: 'Emma', workCreator: 'Jane Austen', workIdentity: 'wikidata:q181558',
    workSelectionEvidence: [{ method: 'independent_work_selection_review', content_id: contentId, work_title: 'Emma', work_creator: 'Jane Austen',
      work_identity: 'wikidata:q181558', reason: 'editorial_exclusion', source_url: 'https://publisher.example.test/emma',
      explanation: '이 작품의 본문과 독서 가치를 검토하여 해당 작품 전체를 선정에서 제외한다.' }] } }
  for (const locale of ['ko', 'en']) {
    const options = { locale, contentId, title: 'Emma', creator: 'Jane Austen', metadata,
      links: [{ platform: 'amazon' as const, url: 'https://www.amazon.com/dp/0141439513' }] }
    assert.deepEqual(getBookPurchaseLinks(options), [])
    assert.ok(getBookPurchaseLinks({ ...options, contentId: 'aba30ef6-4d9b-4f18-bab6-7e2209893df5' }).length > 0)
  }
})
