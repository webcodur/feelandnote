/*
  파일명: /components/features/commerce/quickRecordProducts.ts
  기능: 빠른기록 편집기 옆 가상 상품 시안
  책임: 쿠팡 전환 전 검증할 연결 대상·스펙을 코드에 둔다.
        특정 브랜드·모델·주소를 박지 않고, DB를 쓰지 않으며, 개발자모드·한국어에서만 노출한다.
*/

export interface QuickRecordVirtualProductData {
  id: string
  /** 화면 요소와의 연결 이유 — 편집기 옆에 두는 근거 */
  label: string
  /** 검증 전이라 특정 상품을 지목하지 않는 일반 명칭 */
  name: string
  /** 전환 시 확인할 예시 스펙 (미검증) */
  spec: string
  virtual: true
}

export const QUICK_RECORD_VIRTUAL_PRODUCTS: QuickRecordVirtualProductData[] = [
  {
    id: 'low-noise-keyboard',
    label: '감상문을 타이핑하는 입력 도구',
    name: '저소음 키보드',
    spec: '텐키리스 · 저소음 · BT/2.4G 겸용 (예시 — 미검증)',
    virtual: true,
  },
]
