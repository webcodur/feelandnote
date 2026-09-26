import test from 'node:test'
import assert from 'node:assert/strict'
import { getVerifiedGameProduct } from './targetProducts'

test('검증된 젤다 상품만 실제 쿠팡 상품 URL을 반환한다', () => {
  const product = getVerifiedGameProduct({
    title: '젤다의 전설 브레스 오브 더 와일드',
    creator: 'Nintendo',
  })

  assert.equal(product?.id, 'breath-of-the-wild')
  assert.match(product?.productUrl ?? '', /^https:\/\/www\.coupang\.com\/vp\/products\/\d+/)
})

test('확인하지 않은 게임은 검색 URL로 대체하지 않는다', () => {
  assert.equal(getVerifiedGameProduct({ title: '발더스 게이트 3', creator: 'Larian Studios' }), null)
})

test('마리오 카트 8 디럭스는 개발자 미리보기에서만 같은 판매 옵션을 연결한다', () => {
  const target = { title: '마리오 카트 8 디럭스', creator: '닌텐도', contentId: '76101e55-6bef-4f8c-a8c1-953801d1eafa' }
  assert.equal(getVerifiedGameProduct(target), null)
  const product = getVerifiedGameProduct(target, { includePreview: true })
  assert.ok(product)
  const url = new URL(product.productUrl)
  assert.equal(url.pathname, '/vp/products/8224657857')
  assert.equal(url.searchParams.get('itemId'), '18457463538')
  assert.equal(url.searchParams.get('vendorItemId'), '3519201755')
  assert.match(product.format, /Nintendo Switch.*한국어 본편/)
  assert.equal(getVerifiedGameProduct({ title: 'Mario Kart 8 Deluxe', creator: 'Nintendo' }, { includePreview: true })?.id, product.id)
})

test('Wii U판·속편·다른 제작자·다른 작품 ID에 디럭스 상품을 붙이지 않는다', () => {
  for (const target of [
    { title: '마리오 카트 8', creator: 'Nintendo' },
    { title: 'Mario Kart 8', creator: 'Nintendo' },
    { title: '마리오 카트 월드', creator: 'Nintendo' },
    { title: 'Mario Kart 8 Deluxe', creator: '다른 제작자' },
    { title: 'Mario Kart 8 Deluxe' },
    { title: 'Mario Kart 8 Deluxe', creator: 'Nintendo', contentId: 'e5b1d70d-94c4-45e7-ada2-9c7de5412eaa' },
  ]) assert.equal(getVerifiedGameProduct(target, { includePreview: true }), null)
})
