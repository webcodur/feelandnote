/*
  파일명: /components/features/commerce/quickRecordProducts.ts
  기능: 빠른기록 편집기 옆 쿠팡 상품
  책임: 편집 흐름에 맞는 실제 상품과 스펙을 코드에 둔다.
*/

export interface QuickRecordVirtualProductData {
  id: string
  /** 화면 요소와의 연결 이유 — 편집기 옆에 두는 근거 */
  label: string
  /** 쿠팡 상품명 */
  name: string
  /** 쿠팡 상품 스펙 */
  spec: string
  productUrl: string
}

export const QUICK_RECORD_VIRTUAL_PRODUCTS: QuickRecordVirtualProductData[] = [
  {
    id: 'low-noise-keyboard',
    label: '감상문을 타이핑하는 입력 도구',
    name: '아이리버 2.4GHz+ 블루투스 저소음 무선 텐키리스 키보드',
    spec: '텐키리스 · 저소음 · 무선 (2.4GHz + Bluetooth)',
    productUrl: 'https://www.coupang.com/vp/products/6145320691?itemId=11821222257&vendorItemId=79094698859',
  },
]
