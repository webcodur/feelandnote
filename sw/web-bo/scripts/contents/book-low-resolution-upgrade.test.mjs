import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { imageHeaderSize, isbnCoverCandidates, yes24CoverCandidate, sameCoverAtHigherResolution, buildLowResolutionApplySql, isLowResolution, eligibleCoverRow } from './book-low-resolution-upgrade.mjs'

test('JPEG·PNG·GIF·WebP의 실제 크기를 헤더에서 읽는다', async () => {
  for (const format of ['jpeg','png','gif','webp']) {
    const bytes = await sharp({ create: { width: 427, height: 613, channels: 3, background: '#948458' } }).toFormat(format).toBuffer()
    assert.deepEqual(imageHeaderSize(bytes), { width: 427, height: 613 }, format)
    assert.equal(imageHeaderSize(bytes.subarray(0, 8)), null)
  }
  assert.equal(imageHeaderSize(Buffer.from('not an image')), null)
  assert.equal(isLowResolution({ width: 120, height: 174 }), true)
  assert.equal(isLowResolution({ width: 458, height: 667 }), false)
})

test('ISBN 검증을 통과한 같은 식별자의 표지만 후보로 만든다', () => {
  assert.deepEqual(isbnCoverCandidates('invalid'), [])
  const candidates = isbnCoverCandidates('9780679450788', { description: 'https://www.yes24.com/product/goods/123' })
  assert.ok(candidates.some(c => c.url.includes('/9780679450788.jpg')))
  assert.ok(candidates.some(c => c.url.includes('/0679450785.01.')))
  assert.ok(candidates.some(c => c.verifyPage && c.source.endsWith('/123')))
  assert.ok(candidates.every(c => c.isbn === '9780679450788'))
})

test('더 큰 같은 표지를 통과시키고 다른 표지와 축소를 거부한다', async () => {
  const original = await sharp(Buffer.from('<svg width="450" height="680"><rect width="450" height="680" fill="#ffd27b"/><rect y="440" width="450" height="240" fill="#8caf60"/><circle cx="330" cy="500" r="60" fill="#303030"/></svg>')).png().toBuffer()
  const small = await sharp(original).resize(120).jpeg().toBuffer()
  assert.equal((await sameCoverAtHigherResolution(small, original)).reason, null)
  assert.equal((await sameCoverAtHigherResolution(original, small)).reason, 'not_larger')
  const wrong = await sharp({ create: { width: 450, height: 680, channels: 3, background: '#702040' } }).png().toBuffer()
  assert.ok((await sameCoverAtHigherResolution(small, wrong)).reason)
  const blank = await sharp({ create: { width: 450, height: 680, channels: 3, background: '#fff' } }).png().toBuffer()
  const blankSmall = await sharp(blank).resize(120).png().toBuffer()
  assert.equal((await sameCoverAtHigherResolution(blankSmall, blank)).reason, 'uninformative_image')
})

test('예스24 실제 외서 유형과 정확한 상품 ISBN을 확인한다', () => {
  const isbn = '9780140446043'
  const item = { itemId: 475479, isbn13: isbn, goodsType: '외서', link: 'https://www.yes24.com/product/goods/475479' }
  assert.equal(yes24CoverCandidate({ data: { items: [item] } }, isbn).url, 'https://image.yes24.com/goods/475479/XL')
  assert.equal(yes24CoverCandidate({ data: { items: [{ ...item, isbn13: '9780679450788' }] } }, isbn), null)
  assert.equal(yes24CoverCandidate({ data: { items: [{ ...item, goodsType: 'DVD' }] } }, isbn), null)
})

test('비노출 판본·축약본·후속 분권과 표시용 카드는 화질 교체에서 제외한다', () => {
  const row = { content_id: 'work', locale: 'en', title: 'A Book', isbn: '9780140446043', publisher: 'Publisher', sources: { primary: 'openlibrary' } }
  assert.equal(eligibleCoverRow(row), true)
  assert.equal(eligibleCoverRow({ ...row, editionKind: 'abridged' }), false)
  assert.equal(eligibleCoverRow({ ...row, textScope: 'volume/2' }), false)
  assert.equal(eligibleCoverRow({ ...row, sources: { primary: 'none', title: 'translated' } }), false)
  assert.equal(eligibleCoverRow({ ...row, sources: { ...row.sources, edition_selection_evidence: [{ method: 'independent_selection_review', content_id: 'work', locale: 'en', isbn: row.isbn, edition_title: row.title, reason: 'editorial_exclusion', explanation: '이미 검수하여 서비스에서 제외한 판본의 표지는 그대로 보존한다.', source_url: 'https://publisher.example/book' }] } }), false)
})

test('SQL은 ISBN·이미지 검사와 기존 행 해시를 요구하고 표지와 그 출처만 바꾼다', () => {
  const row = { table: 'content_locales', content_id: 'work', locale: 'ko', isbn: '9780679450788', thumbnail_url: 'https://example.com/old.jpg', row_hash: 'a'.repeat(32) }
  const candidate = { isbn: row.isbn, url: 'https://example.com/new.jpg', source: 'https://example.com/book', verifiedImage: true }
  const sql = buildLowResolutionApplySql([{ row, candidate }])
  assert.match(sql, /md5\(to_jsonb\(t\)::text\)/)
  assert.match(sql, /AND t\.thumbnail_url=/)
  assert.match(sql, /sources=jsonb_set/)
  assert.doesNotMatch(sql, /SET (?:isbn|title|creator|description|publisher)=/)
  assert.throws(() => buildLowResolutionApplySql([{ row, candidate: { ...candidate, verifiedImage: false } }]), /Unverified/)
  assert.throws(() => buildLowResolutionApplySql([{ row, candidate: { ...candidate, isbn: '9780140446043' } }]), /Unverified/)
})
