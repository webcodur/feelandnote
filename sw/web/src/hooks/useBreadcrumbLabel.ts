/*
  파일명: /hooks/useBreadcrumbLabel.ts
  기능: Breadcrumb 동적 라벨 설정 훅
  책임: 컴포넌트 마운트 시 동적 라벨을 설정하고 언마운트 시 정리한다.
*/ // ------------------------------

"use client";

import { useEffect } from "react";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";

export function useBreadcrumbLabel(key: string, label: string | null | undefined) {
  const { setLabel } = useBreadcrumbContext();

  useEffect(() => {
    if (key && label) {
      setLabel(key, label);
    }
  }, [key, label, setLabel]);
}
