/*
  파일명: /components/features/commerce/QuickRecordVirtualProduct.tsx
  기능: 빠른기록 편집기 옆 가상 상품 행 (시안)
  책임: 쿠팡 전환 전 자리·문구·가시성만 검증한다. 외부 링크를 내지 않고 DB를 쓰지 않는다.
*/

"use client";

import VirtualProductRow from "./VirtualProductRow";
import { QUICK_RECORD_VIRTUAL_PRODUCTS } from "./quickRecordProducts";

export default function QuickRecordVirtualProduct() {
  const product = QUICK_RECORD_VIRTUAL_PRODUCTS[0];
  if (!product) return null;

  return (
    <VirtualProductRow
      id="quick-record"
      name={product.name}
      spec={product.spec}
      label={product.label}
    />
  );
}
