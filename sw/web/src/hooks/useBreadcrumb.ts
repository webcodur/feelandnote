/*
  파일명: /hooks/useBreadcrumb.ts
  기능: Breadcrumb 데이터 생성 훅
  책임: 현재 경로를 분석하여 breadcrumb 아이템 배열을 반환한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { BREADCRUMB_LABELS, DYNAMIC_SEGMENT_LABELS, HIDDEN_BREADCRUMB_PATHS } from "@/constants/breadcrumb";
import type { BreadcrumbItem } from "@/components/ui/Breadcrumb";

export function useBreadcrumb(): BreadcrumbItem[] {
  const pathname = usePathname();
  const { dynamicLabels } = useBreadcrumbContext();

  return useMemo(() => {
    // 숨김 경로 체크
    if (HIDDEN_BREADCRUMB_PATHS.includes(pathname)) return [];

    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return [];

    const items: BreadcrumbItem[] = [];
    let currentPath = "";

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;
      const isLast = i === segments.length - 1;

      // 라벨 결정: 1) Context 동적 라벨 2) 정적 라벨 3) 동적 세그먼트 기본값 4) 세그먼트 그대로
      const label =
        dynamicLabels[segment] ??
        BREADCRUMB_LABELS[currentPath] ??
        DYNAMIC_SEGMENT_LABELS[segment] ??
        segment;

      items.push({
        label,
        href: isLast ? undefined : currentPath,
      });
    }

    return items;
  }, [pathname, dynamicLabels]);
}
