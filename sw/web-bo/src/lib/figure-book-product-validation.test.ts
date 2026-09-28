import assert from 'node:assert/strict'
import test from 'node:test'
import { validateProductInput } from './figure-book-product-validation'

const coupangInput = {
  platform: 'coupang',
  productId: '1234567',
  productUrl: 'https://www.coupang.com/vp/products/1234567',
  affiliateUrl: 'https://link.coupang.com/a/abcd123',
  qualityEvidence: ['로켓배송 배지 확인'],
}

const amazonInput = {
  platform: 'amazon',
  productId: '0199538360',
  productUrl: 'https://www.amazon.com/dp/0199538360',
  affiliateUrl: 'https://www.amazon.com/dp/0199538360?tag=feelandnote-20',
  qualityEvidence: ['Paperback format 확인'],
}

test('쿠팡 상품은 기존 규칙대로 통과한다', () => {
  assert.deepEqual(validateProductInput(coupangInput), ['로켓배송 배지 확인'])
  assert.throws(
    () => validateProductInput({ ...coupangInput, affiliateUrl: 'https://www.coupang.com/vp/products/1' }),
    /쿠팡 파트너스 단축 주소/,
  )
})

test('아마존 상품은 태그가 붙은 dp 주소와 amzn.to 단축을 통과한다', () => {
  assert.deepEqual(validateProductInput(amazonInput), ['Paperback format 확인'])
  assert.deepEqual(
    validateProductInput({ ...amazonInput, affiliateUrl: 'https://amzn.to/3abcXYZ' }),
    ['Paperback format 확인'],
  )
  // 태그 없는 정본 상품 주소도 받는다 — 화면에서 tag를 얹는다
  assert.deepEqual(
    validateProductInput({ ...amazonInput, affiliateUrl: 'https://www.amazon.com/dp/0199538360' }),
    ['Paperback format 확인'],
  )
})

test('아마존 상품의 잘못된 입력을 거절한다', () => {
  assert.throws(
    () => validateProductInput({ ...amazonInput, productId: '019953836' }),
    /ASIN은 10자리/,
  )
  assert.throws(
    () => validateProductInput({ ...amazonInput, productUrl: 'https://www.amazon.co.uk/dp/0199538360' }),
    /상품 주소는 amazon\.com/,
  )
  assert.throws(
    () => validateProductInput({ ...amazonInput, productUrl: 'https://www.amazon.com/dp/0140437827' }),
    /상품 번호가 다릅니다/,
  )
  assert.throws(
    () => validateProductInput({ ...amazonInput, affiliateUrl: 'https://www.amazon.com/dp/0199538360?tag=other-20' }),
    /tag는 feelandnote-20/,
  )
  assert.throws(
    () => validateProductInput({ ...amazonInput, affiliateUrl: 'https://www.amazon.com/dp/0140437827?tag=feelandnote-20' }),
    /제휴 주소의 ASIN/,
  )
  assert.throws(
    () => validateProductInput({ ...amazonInput, affiliateUrl: 'https://evil.test/dp/0199538360' }),
    /amazon\.com 또는 amzn\.to/,
  )
})
