import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { normalizeKakaoBookCoverUrl } from '../../../../packages/content-search/src/kakao-books.ts'
import { originalCoverUrl, compareCoverImages, buildThumbnailUpgradeSql, revalidateThumbnailCaches } from './book-thumbnail-upgrade.mjs'

const wrapped = 'https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F4459360%3Ftimestamp%3D20240806155835'
test('신규 카카오 수집도 축소 썸네일 대신 같은 원본을 반환한다', () => {
  assert.equal(normalizeKakaoBookCoverUrl(wrapped), originalCoverUrl(wrapped))
})

test('기존 표지 파일과 식별자를 유지하면서 크기 지정만 바꾼다', () => {
  assert.equal(originalCoverUrl(wrapped), 'https://t1.daumcdn.net/lbook/image/4459360?timestamp=20240806155835')
  assert.equal(originalCoverUrl('https://covers.openlibrary.org/b/id/123-M.jpg'), 'https://covers.openlibrary.org/b/id/123-L.jpg')
  assert.equal(originalCoverUrl('https://covers.openlibrary.org/b/isbn/9780140446043-M.jpg'), 'https://covers.openlibrary.org/b/isbn/9780140446043-L.jpg')
  assert.equal(originalCoverUrl('https://covers.openlibrary.org/b/olid/OL123M-S.jpg'), 'https://covers.openlibrary.org/b/olid/OL123M-L.jpg')
  assert.equal(originalCoverUrl('https://image.aladin.co.kr/product/2373/90/cover150/897504582x_1.jpg'), 'https://image.aladin.co.kr/product/2373/90/cover500/897504582x_1.jpg')
  assert.equal(originalCoverUrl('https://image.yes24.com/goods/123/l'), 'https://image.yes24.com/goods/123/XL')
  assert.equal(originalCoverUrl('https://cup-us.imgix.net/covers/9780231169325.jpg?auto=format&w=350'), 'https://cup-us.imgix.net/covers/9780231169325.jpg?auto=format')
  for (const url of ['not a URL', 'https://example.com/cover.jpg', 'https://covers.openlibrary.org/b/isbn/not-an-isbn-M.jpg',
    'https://image.aladin.co.kr/product/2373/90/cover500/897504582x_1.jpg',
    'https://image.aladin.co.kr.evil.test/product/2373/90/cover150/897504582x_1.jpg',
    'https://image.yes24.com/goods/123/XL',
    'https://cup-us.imgix.net/covers/9780231169325.jpg?w=350&crop=faces',
    'https://cup-us.imgix.net/covers/9780231169325.jpg?w=350&h=500',
    'https://search1.kakaocdn.net/thumb/R120x174/?fname=http://127.0.0.1/secret',
    'https://search1.kakaocdn.net/thumb/R120x174/?fname=http://t1.daumcdn.net@evil.test/lbook/image/123',
    'https://search1.kakaocdn.net/thumb/R120x174/?fname=http://t1.daumcdn.net/other/123']) assert.equal(originalCoverUrl(url), null)
})

test('실제 픽셀로 같은 표지 확대와 다른 표지·작은 원본을 구별한다', async () => {
  const original = await sharp(Buffer.from('<svg width="400" height="600"><rect width="400" height="600" fill="#ffd27b"/><rect y="440" width="400" height="160" fill="#8caf60"/><rect x="250" y="440" width="150" height="160" fill="#303030"/></svg>')).png().toBuffer()
  const small = await sharp(original).resize(120, 180).jpeg({ quality: 80 }).toBuffer()
  assert.equal((await compareCoverImages(small, original)).reason, null)
  assert.equal((await compareCoverImages(original, small)).reason, 'not_larger')
  const wrong = await sharp({ create: { width: 400, height: 600, channels: 3, background: '#102040' } }).png().toBuffer()
  assert.equal((await compareCoverImages(small, wrong)).reason, 'different_image')
  const stretched = await sharp(original).resize(500, 500).png().toBuffer()
  assert.equal((await compareCoverImages(small, stretched)).reason, 'different_aspect')
  const padded = await sharp(original).resize(120, 120, { fit: 'contain', background: '#fff' }).jpeg().toBuffer()
  assert.equal((await compareCoverImages(padded, original, { thumbnailCanvas: true })).reason, null)
  assert.equal((await compareCoverImages(padded, wrong, { thumbnailCanvas: true })).reason, 'different_image')
})

test('교체 SQL은 원래 주소와 전체 행 해시를 요구하고 책정보·출처는 바꾸지 않는다', () => {
  const row = { table: 'figure_book_editions', content_id: 'work', id: 24010, row_hash: 'a'.repeat(32), thumbnail_url: wrapped }
  const sql = buildThumbnailUpgradeSql([{ row, cover: originalCoverUrl(wrapped) }])
  assert.match(sql, /t\.thumbnail_url=E'https:\/\/search1/)
  assert.match(sql, /md5\(to_jsonb\(t\)::text\)=E'a{32}'/)
  assert.doesNotMatch(sql, /SET (?:sources|title|creator|isbn|publisher)=/)
  assert.throws(() => buildThumbnailUpgradeSql([{ row, cover: 'https://t1.daumcdn.net/lbook/image/999' }]), /Unverified/)
})

test('개발 서버가 꺼져 있어도 운영 캐시를 갱신하고 환경변수를 복원한다', async () => {
  const origins = [], events = [], previous = process.env.NEXT_PUBLIC_WEB_URL
  await revalidateThumbnailCaches(async origin => {
    origins.push(origin)
    if (origin.includes('localhost')) throw new Error('connection failed', { cause: Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }) })
  }, event => events.push(event))
  assert.deepEqual(origins, ['http://localhost:3000', 'https://feelandnote.com'])
  assert.ok(events.includes('thumbnail_local_cache_not_running'))
  assert.ok(events.includes('thumbnail_cache_revalidated'))
  assert.equal(process.env.NEXT_PUBLIC_WEB_URL, previous)
})

test('로컬 검증 오류 뒤에도 운영 갱신을 시도하고 캐시 실패를 숨기지 않는다', async () => {
  const origins = []
  await assert.rejects(revalidateThumbnailCaches(async origin => { origins.push(origin); throw new Error('invalid cache response') }, () => {}), /incomplete/)
  assert.deepEqual(origins, ['http://localhost:3000', 'https://feelandnote.com'])
})
