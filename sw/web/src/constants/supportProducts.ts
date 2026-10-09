import { AFFILIATE_PLATFORMS } from '@/constants/affiliatePlatforms'

export const SUPPORT_PRODUCT_KINDS = ['rice', 'paper', 'laundry', 'water', 'bath', 'kitchen', 'food', 'frozen', 'meal', 'drink', 'coffee', 'stand', 'desk', 'pen', 'penCase', 'penHolder', 'notebook', 'reader', 'light', 'remote', 'bookHolder', 'bookmark', 'timer', 'speaker', 'labelPrinter', 'object'] as const
export type SupportProductKind = typeof SUPPORT_PRODUCT_KINDS[number]

export interface SupportProduct {
  kind: SupportProductKind
  name: string
  size: string
  /** 나란히 비교할 상품의 묶음. */
  pair?: string
  description?: string
  productUrl: string
  imageUrl?: string
  /** 파트너스 화면에서 만든 링크만 넣는다. 일반 상품 주소는 productUrl에 둔다. */
  affiliateUrl?: string
  /** 상품 상세에서 확인한 판매 옵션의 정보. 회원 전용가는 쓰지 않는다. */
  offer?: {
    price: number
    currency: 'KRW' | 'USD'
    checkedAt: string
    delivery: 'rocket' | 'rocketFresh' | 'sellerRocket' | 'rocketWow' | 'standard'
    reviewCount: number
    rating?: number
    monthlyPurchaseCount?: number
    priceCondition?: 'coupon'
  }
}

export const SHOP_PRODUCT_GROUPS: { id: string; kinds: SupportProductKind[] }[] = [
  { id: 'devices', kinds: ['reader', 'light', 'remote'] },
  { id: 'bookTools', kinds: ['stand', 'desk'] },
  { id: 'readingAccessories', kinds: ['bookmark', 'bookHolder'] },
  { id: 'writing', kinds: ['pen', 'notebook', 'penCase', 'penHolder'] },
  { id: 'deskObjects', kinds: ['timer', 'speaker', 'labelPrinter', 'object'] },
]

export const SUPPORT_PRODUCT_GROUPS: { id: string; kinds: SupportProductKind[] }[] = [
  { id: 'food', kinds: ['rice', 'food'] },
  { id: 'frozen', kinds: ['frozen'] },
  { id: 'meals', kinds: ['meal'] },
  { id: 'drinks', kinds: ['water', 'drink', 'coffee'] },
  { id: 'household', kinds: ['paper', 'laundry', 'bath', 'kitchen'] },
]

export function getCommerceProductGroups(products: SupportProduct[], page: 'support' | 'shop') {
  return (page === 'shop' ? SHOP_PRODUCT_GROUPS : SUPPORT_PRODUCT_GROUPS)
    .map(group => ({ ...group, products: products.filter(product => group.kinds.includes(product.kind)) }))
    .filter(group => group.products.length > 0)
}

export function getSupportProductLink(product: SupportProduct, locale: 'ko' | 'en') {
  if (locale === 'en') {
    const url = new URL(product.productUrl)
    url.searchParams.set('tag', AFFILIATE_PLATFORMS.amazon.tag)
    return {
      href: url.href,
      affiliate: true,
    }
  }
  if (product.affiliateUrl) return { href: product.affiliateUrl, affiliate: true }
  return {
    href: product.productUrl,
    affiliate: false,
  }
}
