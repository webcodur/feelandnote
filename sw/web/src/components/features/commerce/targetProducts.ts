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
    timelineKey: 'music/media', eraId: 'lp_vinyl', label: "비틀즈 Sgt. Pepper's (1967)",
    product: {
      id: 'sgt-pepper', name: "Sgt. Pepper’s Lonely Hearts Club Band",
      imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/640x640ex/image/vendor_inventory/7d4b/b92bb472e4c9f290f83a83e08e5cff5212dbd3393f9125a0c13e576d9826.png',
      productUrl: 'https://www.coupang.com/vp/products/7362671012?itemId=18972779700&vendorItemId=86098316206',
      format: 'LP · 발매 50주년 기념반', variant: 'caption', checkedAt: '2026-09-14',
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

/** 검색 결과가 아니라 현재 확인한 상품만 작품 카드에서 직접 연결한다. */
export function getVerifiedGameProduct({ title, creator }: { title: string; creator?: string | null }) {
  const normalizedCreator = normalizeGameText(creator)
  if (
    BREATH_OF_THE_WILD_TITLES.has(normalizeGameText(title))
    && (!normalizedCreator || NINTENDO_CREATORS.has(normalizedCreator))
  ) {
    return TARGET_PRODUCTS.find((match) => match.product.id === 'breath-of-the-wild')?.product ?? null
  }
  return null
}
