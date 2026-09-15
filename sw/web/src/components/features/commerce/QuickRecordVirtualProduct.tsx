/*
  파일명: /components/features/commerce/QuickRecordVirtualProduct.tsx
  기능: 빠른기록 편집기 옆 쿠팡 상품
  책임: 편집 흐름에 맞는 실제 상품 링크를 보여준다.
*/

"use client";

import VirtualProductRow from "./VirtualProductRow";
import { QUICK_RECORD_VIRTUAL_PRODUCTS } from "./quickRecordProducts";

export default function QuickRecordVirtualProduct() {
  const product = QUICK_RECORD_VIRTUAL_PRODUCTS[0];
  if (!product?.productUrl?.trim()) return null;

  return (
    <VirtualProductRow
      id="quick-record"
      name={product.name}
      spec={product.spec}
      label={product.label}
      productUrl={product.productUrl}
    />
  );
}
