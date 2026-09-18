/*
  파일명: /components/features/commerce/VirtualProductRow.tsx
  기능: 파트별 쿠팡 상품의 공통 행
  책임: 개발자 모드·한국어에서 상품 정보와 직접 링크를 보여준다.
*/

"use client";

import { useLocale } from "next-intl";
import { PackageSearch } from "lucide-react";

interface VirtualProductRowProps {
  /** 파트 식별자 — data 속성으로 남겨 시안 위치를 찾는다 */
  id: string;
  /** 상품명 */
  name: string;
  /** 상품 스펙 */
  spec: string;
  /** 화면 요소와의 연결 이유 */
  label: string;
  /** 현재 화면의 실제 대상 (선택된 작품 등) — 있으면 함께 보여준다 */
  context?: string;
  productUrl?: string;
}

export default function VirtualProductRow({ id, name, spec, label, context, productUrl }: VirtualProductRowProps) {
  const locale = useLocale();
  // 개발 서버에서만 그린다. 운영 빌드에는 'production'이 박혀 노출되지 않는다
  if (process.env.NODE_ENV !== "development") return null;
  if (locale !== "ko") return null;
  // 실제 상품을 확인하지 못한 항목은 행뿐 아니라 모듈 전체를 숨긴다.
  if (!productUrl?.trim()) return null;

  const row = (
    <div
      data-commerce-virtual-item={id}
      title={`${label} · ${name}`}
      className="flex items-center gap-3 rounded-xl border border-white/5 bg-bg-card/50 px-3 py-2.5 outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-text-secondary">
        <PackageSearch size={16} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">
          {name}
        </span>
        <span className="mt-0.5 block truncate text-xs text-text-secondary">
          {label} · {spec}
        </span>
        {context && (
          <span className="mt-0.5 block truncate text-xs text-accent/80">
            지금 대상: {context}
          </span>
        )}
      </span>
      <span className="shrink-0 whitespace-nowrap text-xs font-medium text-text-tertiary">
        쿠팡에서 보기
      </span>
    </div>
  );

  return (
    <div
      data-commerce-virtual={id}
      className="w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
          쿠팡 상품
        </span>
        <span className="text-xs text-text-secondary">
          실제 상품 링크
        </span>
      </div>
      <a href={productUrl} target="_blank" rel="noreferrer" data-commerce-product={id}>
        {row}
      </a>
    </div>
  );
}
