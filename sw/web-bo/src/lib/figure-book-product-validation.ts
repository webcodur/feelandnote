// 어소시에이트 추적 ID — sw/web/src/constants/affiliatePlatforms.ts의 amazon.tag와 같은 값
const AMAZON_ASSOCIATE_TAG = 'feelandnote-20'
const ASIN_RE = /^[0-9A-Z]{10}$/

export function validateProductInput(input: {
  platform: string
  productId: string
  productUrl: string
  affiliateUrl: string
  qualityEvidence: string[]
}) {
  if (input.platform !== 'coupang' && input.platform !== 'amazon') {
    throw new Error('판매처는 coupang 또는 amazon이어야 합니다')
  }
  if (!input.productId.trim()) throw new Error('상품 ID가 필요합니다')
  if (!input.productUrl.startsWith('https://')) throw new Error('HTTPS 상품 주소가 필요합니다')
  if (!input.affiliateUrl.startsWith('https://')) throw new Error('HTTPS 제휴 주소가 필요합니다')
  const evidence = input.qualityEvidence.map((value) => value.trim()).filter(Boolean)
  if (evidence.length === 0) throw new Error('상품 화면에서 확인한 품질 근거가 필요합니다')
  if (input.platform === 'coupang') {
    if (!/^\d+$/.test(input.productId)) throw new Error('쿠팡 상품 ID는 숫자여야 합니다')
    if (!/^https:\/\/(?:www\.)?coupang\.com\/vp\/products\/\d+/.test(input.productUrl)) {
      throw new Error('쿠팡 상품 상세 주소가 올바르지 않습니다')
    }
    const urlProductId = new URL(input.productUrl).pathname.match(/\/vp\/products\/(\d+)/)?.[1]
    if (urlProductId !== input.productId) {
      throw new Error('쿠팡 상품 ID와 상품 상세 주소의 상품 번호가 다릅니다')
    }
    if (!/^https:\/\/link\.coupang\.com\/a\/[A-Za-z0-9]+\/?$/.test(input.affiliateUrl)) {
      throw new Error('쿠팡 파트너스 단축 주소가 올바르지 않습니다')
    }
    if (!evidence.some((value) => /badge|배지|뱃지|로켓\s*배송|도착\s*보장/i.test(value))) {
      throw new Error('쿠팡 상품에는 로켓배송·도착 보장 같은 배송 배지 근거가 필요합니다')
    }
  }
  if (input.platform === 'amazon') {
    const asin = input.productId.trim()
    if (!ASIN_RE.test(asin)) throw new Error('아마존 ASIN은 10자리 영숫자여야 합니다')
    const productMatch = input.productUrl.match(
      /^https:\/\/(?:www\.)?amazon\.com\/(?:dp|gp\/product)\/([0-9A-Z]{10})/,
    )
    if (!productMatch) {
      throw new Error('아마존 상품 주소는 amazon.com/dp/<ASIN> 또는 /gp/product/<ASIN>이어야 합니다')
    }
    if (productMatch[1] !== asin) {
      throw new Error('ASIN과 상품 주소의 상품 번호가 다릅니다')
    }
    const affiliate = new URL(input.affiliateUrl)
    if (affiliate.hostname === 'amzn.to') {
      // SiteStripe 단축 주소 — 태그가 본문에 박혀 있어 검사할 수 없다
    } else if (/(^|\.)amazon\.com$/.test(affiliate.hostname)) {
      const affiliateAsin = affiliate.pathname.match(/\/(?:dp|gp\/product)\/([0-9A-Z]{10})/)?.[1]
      if (affiliateAsin && affiliateAsin !== asin) {
        throw new Error('제휴 주소의 ASIN이 상품 ID와 다릅니다')
      }
      const tag = affiliate.searchParams.get('tag')
      if (tag !== null && tag !== AMAZON_ASSOCIATE_TAG) {
        throw new Error(`아마존 제휴 주소의 tag는 ${AMAZON_ASSOCIATE_TAG}이어야 합니다`)
      }
    } else {
      throw new Error('아마존 제휴 주소는 amazon.com 또는 amzn.to여야 합니다')
    }
  }
  return evidence
}
