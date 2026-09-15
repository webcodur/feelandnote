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
