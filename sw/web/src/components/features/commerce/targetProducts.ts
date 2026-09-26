/*
  파일명: /components/features/commerce/targetProducts.ts
  기능: 박물관 본문 대상과 실제 판매 상품 연결
  책임: 확인한 상품을 해당 연표·시대·콘텐츠 이름에 정확하게 대응시킨다.
*/

export interface TargetProductData {
  id: string
  name: string
  imageUrl: string
  productUrl: string
  format: string
  variant: 'inline' | 'caption' | 'compact'
  checkedAt: string
}

export type TargetProductMatch = {
  timelineKey: string
  eraId: string
  label: string
  product: TargetProductData
}

export const TARGET_PRODUCTS: TargetProductMatch[] = [
  {
    timelineKey: 'game/interface', eraId: 'analog_haptic', label: '듀얼센스 적응형 트리거 (2020)',
    product: {
      id: 'dualsense', name: '소니 PS5 듀얼센스 무선 컨트롤러',
      imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/640x640ex/image/retail/images/2026/02/02/17/4/641d18aa-aace-4b6c-b7ce-350c4f8f72bf.jpg',
      productUrl: 'https://www.coupang.com/vp/products/6631863973?itemId=20842681344&vendorItemId=94698487899',
      format: '화이트 · CFI-ZCT2G', variant: 'inline', checkedAt: '2026-09-14',
    },
  },
  {
    timelineKey: 'game/graphics', eraId: 'seamless_openworld', label: '젤다: 야생의 숨결 (2017)',
    product: {
      id: 'breath-of-the-wild', name: '젤다의 전설 브레스 오브 더 와일드',
      imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/640x640ex/image/vendor_inventory/49e5/9daef75e47252c4391174691f366443b9710f5ad08fdcd7fd1e8267c4545.jpg',
      productUrl: 'https://www.coupang.com/vp/products/6225165843?itemId=12479742076&vendorItemId=3520535365',
      format: 'Nintendo Switch · 한국어 패키지', variant: 'compact', checkedAt: '2026-09-14',
    },
  },
]

const normalizeGameText = (value: string | null | undefined) =>
  String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

const BREATH_OF_THE_WILD_TITLES = new Set([
  normalizeGameText('젤다의 전설 브레스 오브 더 와일드'),
  normalizeGameText('The Legend of Zelda: Breath of the Wild'),
])

const NINTENDO_CREATORS = new Set([
  normalizeGameText('Nintendo'),
  normalizeGameText('닌텐도'),
  normalizeGameText('Nintendo EPD'),
  normalizeGameText('Nintendo Entertainment Planning & Development'),
])

const MARIO_KART_8_DELUXE_TITLES = new Set([
  normalizeGameText('마리오 카트 8 디럭스'),
  normalizeGameText('Mario Kart 8 Deluxe'),
])

const MARIO_KART_8_DELUXE_PRODUCT: TargetProductData = {
  id: 'mario-kart-8-deluxe', name: '마리오 카트 8 디럭스',
  imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/640x640ex/image/1025_amir_coupang_oct_80k/687e/c5722f17c343d92b13c68a40a65b9b90b61c6254e5ef306cf346aa6ac938.jpg',
  productUrl: 'https://www.coupang.com/vp/products/8224657857?itemId=18457463538&vendorItemId=3519201755',
  format: 'Nintendo Switch · 한국어 본편 패키지', variant: 'compact', checkedAt: '2026-09-26',
}

/** 검색 결과가 아니라 현재 확인한 상품만 작품 카드에서 직접 연결한다. */
export function getVerifiedGameProduct(
  { title, creator, contentId }: { title: string; creator?: string | null; contentId?: string },
  { includePreview = false }: { includePreview?: boolean } = {},
) {
  const normalizedCreator = normalizeGameText(creator)
  // 쿠팡 제휴 승인 전 상품이다. 개발자 화면만 이 미리보기를 요청한다.
  if (
    includePreview
    && MARIO_KART_8_DELUXE_TITLES.has(normalizeGameText(title))
    && NINTENDO_CREATORS.has(normalizedCreator)
    && (!contentId || contentId === '76101e55-6bef-4f8c-a8c1-953801d1eafa')
  ) return MARIO_KART_8_DELUXE_PRODUCT

  if (
    BREATH_OF_THE_WILD_TITLES.has(normalizeGameText(title))
    && (!normalizedCreator || NINTENDO_CREATORS.has(normalizedCreator))
  ) {
    return TARGET_PRODUCTS.find((match) => match.product.id === 'breath-of-the-wild')?.product ?? null
  }
  return null
}
