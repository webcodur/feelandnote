/*
  파일명: /contexts/BreadcrumbContext.tsx
  기능: Breadcrumb 동적 라벨 관리
  책임: 페이지별 동적 라벨(닉네임, 콘텐츠명 등)을 전역으로 관리한다.
*/ // ------------------------------

"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface BreadcrumbContextValue {
  dynamicLabels: Record<string, string>;
  setLabel: (key: string, label: string) => void;
  clearLabels: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});

  const setLabel = useCallback((key: string, label: string) => {
    setDynamicLabels((prev) => ({ ...prev, [key]: label }));
  }, []);

  const clearLabels = useCallback(() => {
    setDynamicLabels({});
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ dynamicLabels, setLabel, clearLabels }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error("useBreadcrumbContext must be used within BreadcrumbProvider");
  }
  return context;
}
