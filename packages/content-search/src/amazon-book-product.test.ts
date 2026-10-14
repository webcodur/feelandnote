import assert from 'node:assert/strict'
import test from 'node:test'
import { amazonBookCandidate, parseAmazonBookPage, verifyAmazonBookProduct } from './amazon-book-product'

const book = { locale: 'en', isbn: '9781605206431', title: 'Confucian Analects, The Great Learning & The Doctrine of The Mean', creator: 'Confucius' }
function page(isbn = book.isbn, language = 'Chinese, English', title = book.title) {
  return `<input id="ASIN" value="1605206431"><span id="productTitle">${title}</span>
    <div id="bylineInfo"><a>Confucius</a><a>James Legge</a></div>
    <div id="detailBullets_feature_div"><ul><li>Publisher : Cosimo Classics</li><li>Language : ${language}</li><li>ISBN-13 : ${isbn}</li></ul></div>`
}
test('ISBN produces a candidate, not a verified product', () => {
  assert.equal(amazonBookCandidate(book)?.productUrl, 'https://www.amazon.com/dp/1605206431')
  assert.equal(amazonBookCandidate({ ...book, locale: 'ko' }), null)
  assert.equal(amazonBookCandidate({ ...book, isbn: '9781605206432' }), null)
  assert.equal(amazonBookCandidate({ ...book, isbn: '9791234567896' }), null)
})
test('exact product details allow the missing purchase link to be filled', () => {
  const evidence = parseAmazonBookPage(page(), 200, 'https://www.amazon.com/dp/1605206431')
  const result = verifyAmazonBookProduct(book, evidence)
  assert.equal(result.status, 'verified')
  if (result.status === 'verified') {
    assert.equal(result.product.productId, '1605206431')
    assert.equal(result.product.affiliateUrl, 'https://www.amazon.com/dp/1605206431')
    assert.ok(result.product.qualityEvidence.some(line => line.includes(book.isbn)))
  }
})
test('HTTP 200 bot pages and transient errors remain unconfirmed', () => {
  for (const [html, status] of [['<title>Amazon.com</title><form action="/errors/validateCaptcha">', 200], ['', 503], ['', 429]] as const) {
    assert.equal(verifyAmazonBookProduct(book, parseAmazonBookPage(html, status, 'https://www.amazon.com/dp/1605206431')).status, 'unconfirmed')
  }
})
test('different ISBN, non-English edition, title and author mismatch cannot be saved', () => {
  for (const html of [page('9780141439518'), page(book.isbn, 'Chinese'), page(book.isbn, 'English', 'Pride and Prejudice'), page().replace('<a>Confucius</a>', '<a>Jane Austen</a>')]) {
    assert.notEqual(verifyAmazonBookProduct(book, parseAmazonBookPage(html, 200, 'https://www.amazon.com/dp/1605206431')).status, 'verified')
  }
})
test('ISBN in recommendations and an off-site redirect are not product identity', () => {
  const html = page('9780141439518') + `<aside>${book.isbn}</aside>`
  assert.notEqual(verifyAmazonBookProduct(book, parseAmazonBookPage(html, 200, 'https://www.amazon.com/dp/1605206431')).status, 'verified')
  assert.notEqual(verifyAmazonBookProduct(book, parseAmazonBookPage(page(), 200, 'https://evil.example/dp/1605206431')).status, 'verified')
})
test('ISBN-10-only details and ampersand title variants are accepted', () => {
  const html = page().replace(`ISBN-13 : ${book.isbn}`, 'ISBN-10 : 1605206431').replace('& The', 'and The')
  assert.equal(verifyAmazonBookProduct(book, parseAmazonBookPage(html, 200, 'https://www.amazon.com/dp/1605206431')).status, 'verified')
})
test('short real titles remain eligible when the edition ISBN and author match', () => {
  const short = { ...book, title: 'It' }
  assert.equal(verifyAmazonBookProduct(short, parseAmazonBookPage(page(book.isbn, 'English', 'It: A Novel'), 200, 'https://www.amazon.com/dp/1605206431')).status, 'verified')
})

test('conflicting ISBN-10 and ISBN-13 on the same detail page are not an exact edition', () => {
  const html = page().replace('ISBN-13', 'ISBN-10 : 0141439513</li><li>ISBN-13')
  assert.notEqual(verifyAmazonBookProduct(book, parseAmazonBookPage(html, 200, 'https://www.amazon.com/dp/1605206431')).status, 'verified')
})

test('an absent catalog author leaves the product unverified', () => {
  assert.notEqual(verifyAmazonBookProduct({ ...book, creator: null }, parseAmazonBookPage(page(), 200, 'https://www.amazon.com/dp/1605206431')).status, 'verified')
})

test('a short work title cannot silently select a boxed set', () => {
  assert.notEqual(verifyAmazonBookProduct(book, parseAmazonBookPage(page(book.isbn, 'English', book.title + ' Boxed Set'), 200, 'https://www.amazon.com/dp/1605206431')).status, 'verified')
})
