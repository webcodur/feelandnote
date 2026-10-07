import assert from 'node:assert/strict'
import test from 'node:test'
import { getBookPurchaseLinks } from './bookPurchaseLinks'

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

test('English books always offer tagged Amazon search and discard Korean purchase routes', () => {
  const links = getBookPurchaseLinks({ locale: 'en', contentId, title: 'Emma', creator: 'Jane Austen',
    links: [{ platform: 'coupang', url: 'https://link.coupang.com/a/example' },
      { platform: 'google_books', url: 'https://books.google.com/books?id=old' }], yes24Href: 'https://www.yes24.com/Product/Goods/1' })
  assert.equal(links.length, 1)
  const [link] = links
  assert.equal(link.platform, 'amazon')
  assert.equal(link.linkKind, 'search')
  const url = new URL(link.url)
  assert.equal(url.hostname, 'www.amazon.com')
  assert.equal(url.searchParams.get('k'), 'Emma Jane Austen')
  assert.equal(url.searchParams.get('tag'), 'feelandnote-20')
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
  assert.equal(links.find(link => link.platform === 'coupang')?.url, 'https://link.coupang.com/a/valid')
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
